import pandas as pd
import numpy as np
import logging
import re
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


ADDITIVE_METRIC_TOKENS = (
    "revenue", "sales", "profit", "cost", "spend", "amount", "quantity",
    "units", "orders", "transactions", "volume", "savings", "expense",
    "expenses", "fee", "fees", "payment", "payments", "tax", "count", "sum",
)
NON_ADDITIVE_METRIC_TOKENS = (
    "age", "temperature", "temp", "rate", "percent", "percentage", "pct",
    "ratio", "score", "rating", "price", "margin", "discount", "duration",
    "latitude", "longitude", "weight", "height",
)
CURRENCY_TOKENS = (
    "revenue", "sales", "profit", "cost", "spend", "amount", "price",
    "fee", "fees", "savings", "expense", "expenses", "payment", "payments", "tax",
)
IDENTIFIER_TOKENS = ("id", "index", "row number", "record number", "serial number")
NON_METRIC_TOKENS = (
    "year", "month", "day", "hour", "minute", "second", "quarter", "week",
    "latitude", "longitude", "direction", "bearing", "elevation",
)
PREFERRED_DIMENSION_TOKENS = (
    "segment", "category", "region", "department", "product", "service",
    "channel", "status", "country", "state", "city", "class", "group", "team",
)


class DataProfiler:
    ANALYTICS_VERSION = 5
    KPI_LIMIT = 3

    @staticmethod
    def _normalized_name(name: Any) -> str:
        separated = re.sub(r"(?<=[a-z0-9])(?=[A-Z])", " ", str(name))
        return " ".join(re.findall(r"[a-z0-9]+", separated.lower()))

    @staticmethod
    def _has_token(name: Any, tokens: tuple) -> bool:
        return bool(set(DataProfiler._normalized_name(name).split()) & set(tokens))

    @staticmethod
    def _metric_label(name: str) -> str:
        words = DataProfiler._normalized_name(name).split()
        if words and words[0] == "total":
            words = words[1:]
        if words and words[-1] in {"sum", "mean", "average", "avg", "median", "max", "min", "count"}:
            words = words[:-1]
        return " ".join(words).title()

    @staticmethod
    def _aggregation_label(aggregation: str) -> str:
        return "Total" if aggregation == "sum" else "Average"

    @staticmethod
    def _metric_family(name: str) -> str:
        normalized = DataProfiler._normalized_name(name)
        if DataProfiler._has_token(name, ("temperature", "temp", "apparent")):
            return "temperature"
        if DataProfiler._has_token(name, ("precipitation", "rain", "snow", "snowfall")):
            return "precipitation"
        if any(word.startswith("wind") for word in normalized.split()):
            return "wind"
        if DataProfiler._has_token(name, ("revenue", "sales", "turnover")):
            return "sales"
        if DataProfiler._has_token(name, ("profit", "margin")):
            return "profit"
        if DataProfiler._has_token(name, ("cost", "expense", "expenses", "spend")):
            return "cost"
        if DataProfiler._has_token(name, ("savings",)):
            return "savings"
        if DataProfiler._has_token(name, ("quantity", "units", "volume")):
            return "volume"

        qualifiers = {
            "total", "sum", "mean", "average", "avg", "median", "max", "min",
            "count", "daily", "monthly", "annual",
        }
        words = [
            word for word in normalized.split()
            if word not in qualifiers and not re.fullmatch(r"\d+[a-z]*", word)
        ]
        return " ".join(words) or normalized

    @staticmethod
    def _metric_priority(spec: Dict[str, Any], column_order: int) -> tuple:
        name = spec["name"]
        priorities = (
            ("revenue", "sales", "turnover"),
            ("profit", "margin"),
            ("savings",),
            ("quantity", "units", "orders", "transactions", "volume", "count"),
            ("cost", "expense", "expenses", "spend"),
            ("temperature", "temp", "apparent"),
            ("precipitation", "rain", "snow", "snowfall"),
            ("wind",),
        )
        for rank, tokens in enumerate(priorities):
            if DataProfiler._has_token(name, tokens):
                return (rank, column_order)
        if any(word.startswith("wind") for word in DataProfiler._normalized_name(name).split()):
            return (7, column_order)
        if spec["aggregation"] == "sum":
            return (len(priorities), column_order)
        if DataProfiler._has_token(name, NON_ADDITIVE_METRIC_TOKENS):
            return (len(priorities) + 1, column_order)
        return (len(priorities) + 2, column_order)

    @staticmethod
    def _select_diverse_metrics(metric_specs: list, limit: int = 3) -> List[Dict[str, Any]]:
        selected = []
        seen_families = set()
        for spec in metric_specs:
            family = DataProfiler._metric_family(spec["name"])
            if family in seen_families:
                continue
            selected.append(spec)
            seen_families.add(family)
            if len(selected) == limit:
                break
        return selected

    @staticmethod
    def _find_metric(metric_specs: list, tokens: tuple) -> str | None:
        for spec in metric_specs:
            if DataProfiler._has_token(spec["name"], tokens):
                return spec["name"]
        return None

    @staticmethod
    def _business_dimensions(columns: list, df: pd.DataFrame) -> List[str]:
        tokens = (
            ("category", "department", "class"),
            ("region", "country", "state", "territory"),
            ("product", "service", "item"),
            ("channel", "platform"),
            ("segment", "customer", "client"),
        )
        candidates = [
            column
            for column in columns
            if column["type"] == "categorical"
            and 1 < column.get("unique_count", 0) <= 30
            and not DataProfiler._is_identifier(column, len(df))
        ]
        prioritized = []
        for group in tokens:
            match = next(
                (
                    column["name"]
                    for column in candidates
                    if column["name"] not in prioritized
                    and DataProfiler._has_token(column["name"], group)
                ),
                None,
            )
            if match:
                prioritized.append(match)
        if not prioritized:
            preferred = DataProfiler._preferred_dimension(df, columns)
            return [preferred] if preferred else []
        return prioritized[:2]

    @staticmethod
    def _metric_chart_metadata(
        metric_labels: Dict[str, str],
        metric_aggregations: Dict[str, str],
        metric_currency: Dict[str, bool],
    ) -> Dict[str, Any]:
        return {
            "available_metrics": list(metric_labels),
            "metric_labels": metric_labels,
            "metric_aggregations": metric_aggregations,
            "metric_currency": metric_currency,
            "is_currency": metric_currency.get(next(iter(metric_labels)), False),
        }

    @staticmethod
    def _count_invalid_values(df: pd.DataFrame) -> int:
        invalid_count = 0
        for column in df.columns:
            name = DataProfiler._normalized_name(column)
            values = pd.to_numeric(df[column], errors="coerce").dropna()
            if values.empty:
                continue

            if DataProfiler._has_token(column, ("discount", "percent", "percentage", "pct", "rate")):
                scale_limit = 1 if values.quantile(0.95) <= 1 else 100
                invalid_count += int(((values < 0) | (values > scale_limit)).sum())
            elif DataProfiler._has_token(column, ("age",)):
                invalid_count += int(((values < 0) | (values > 120)).sum())
            elif DataProfiler._has_token(column, ("rating",)):
                upper_limit = 5 if values.quantile(0.95) <= 5 else 10
                invalid_count += int(((values < 0) | (values > upper_limit)).sum())
            elif DataProfiler._has_token(column, ("quantity", "units", "delivery")) or name.endswith(" days"):
                invalid_count += int((values < 0).sum())
            elif DataProfiler._has_token(column, ("price", "cost", "expense", "expenses")):
                invalid_count += int((values < 0).sum())

        return invalid_count

    @staticmethod
    def _calculate_data_quality(df: pd.DataFrame) -> Dict[str, Any]:
        row_count, column_count = df.shape
        total_cells = row_count * column_count
        missing_cells = int(df.isna().sum().sum())
        invalid_values = DataProfiler._count_invalid_values(df)
        duplicate_rows = int(df.duplicated().sum())
        missing_rate = missing_cells / total_cells if total_cells else 0
        invalid_rate = invalid_values / total_cells if total_cells else 0
        duplicate_rate = duplicate_rows / row_count if row_count else 0
        score = max(
            0.0,
            min(100.0, 100.0 - missing_rate * 200 - invalid_rate * 100 - duplicate_rate * 20),
        )
        return {
            "score": round(score, 1),
            "missing_cells": missing_cells,
            "invalid_values": invalid_values,
            "duplicate_rows": duplicate_rows,
        }

    @staticmethod
    def _profitability_chart(
        df: pd.DataFrame,
        dimension: str,
        revenue_col: str,
        profit_col: str,
        discount_col: str | None = None,
    ) -> Dict[str, Any] | None:
        try:
            grouped = df.groupby(dimension, dropna=True).agg(
                revenue=(revenue_col, "sum"),
                profit=(profit_col, "sum"),
                transaction_count=(revenue_col, "count"),
            )
            if discount_col:
                discount_values = pd.to_numeric(df[discount_col], errors="coerce")
                discount_scale = (
                    100
                    if not discount_values.dropna().empty
                    and discount_values.quantile(0.95) <= 1
                    else 1
                )
                grouped["average_discount_pct"] = (
                    (discount_values * discount_scale)
                    .groupby(df[dimension])
                    .mean()
                )
            grouped = grouped[grouped["revenue"] > 0]
            if grouped.empty:
                return None
            grouped["profit_margin_pct"] = grouped["profit"] / grouped["revenue"] * 100
            grouped = grouped.sort_values("profit_margin_pct", ascending=False).head(12)
            records = grouped.reset_index()
            records[dimension] = records[dimension].astype(str)
            records = records.round(2)

            labels = {
                "profit_margin_pct": "Profit Margin",
                "revenue": "Revenue",
                "profit": "Profit",
                "transaction_count": "Transactions",
            }
            aggregations = {
                "profit_margin_pct": "Margin",
                "revenue": "Total",
                "profit": "Total",
                "transaction_count": "Count",
            }
            currencies = {
                "profit_margin_pct": False,
                "revenue": True,
                "profit": True,
                "transaction_count": False,
            }
            if discount_col:
                labels["average_discount_pct"] = "Average Discount"
                aggregations["average_discount_pct"] = "Average"
                currencies["average_discount_pct"] = False

            best = records.iloc[0]
            worst = records.iloc[-1]
            insight = (
                f"Highest margin: {best[dimension]} ({best['profit_margin_pct']:.1f}%); "
                f"lowest: {worst[dimension]} ({worst['profit_margin_pct']:.1f}%). "
                "Review the lower-margin segment's pricing and cost mix."
            )
            metadata = DataProfiler._metric_chart_metadata(labels, aggregations, currencies)
            return {
                "id": f"chart_profitability_{DataProfiler._normalized_name(dimension).replace(' ', '_')}",
                "title": f"Profitability by {dimension.replace('_', ' ').title()}",
                "subtitle": "Compare margin, profit, revenue, and transaction volume.",
                "insight": insight,
                "type": "bar",
                "category": "Profitability",
                "data": records.to_dict(orient="records"),
                "x_key": dimension,
                "y_key": "profit_margin_pct",
                **metadata,
            }
        except (KeyError, TypeError, ValueError):
            logger.warning("Unable to generate profitability chart for %s", dimension, exc_info=True)
            return None

    @staticmethod
    def _discount_effect_chart(
        df: pd.DataFrame,
        discount_col: str,
        revenue_col: str,
        profit_col: str,
    ) -> Dict[str, Any] | None:
        try:
            temp = df.copy()
            discount = pd.to_numeric(temp[discount_col], errors="coerce")
            scale = 100 if discount.quantile(0.95) <= 1 else 1
            temp["_discount_pct"] = discount * scale
            temp = temp.dropna(subset=["_discount_pct"])
            if temp.empty:
                return None

            def discount_band(value: float) -> str:
                if value <= 0:
                    return "No discount"
                if value <= 10:
                    return "Low (0-10%)"
                if value <= 20:
                    return "Moderate (10-20%)"
                return "High (>20%)"

            temp["_discount_band"] = temp["_discount_pct"].map(discount_band)
            band_order = ["No discount", "Low (0-10%)", "Moderate (10-20%)", "High (>20%)"]
            grouped = temp.groupby("_discount_band", observed=False).agg(
                revenue=(revenue_col, "sum"),
                profit=(profit_col, "sum"),
                transaction_count=(revenue_col, "count"),
                average_discount_pct=("_discount_pct", "mean"),
            )
            grouped = grouped[grouped["transaction_count"] > 0]
            grouped["profit_margin_pct"] = grouped["profit"] / grouped["revenue"].where(
                grouped["revenue"] > 0
            ) * 100
            grouped = grouped.reindex([band for band in band_order if band in grouped.index]).dropna(
                subset=["profit_margin_pct"]
            )
            if len(grouped) < 2:
                return None
            records = grouped.reset_index().rename(columns={"_discount_band": "discount_band"})
            records["average_discount_pct"] = records["average_discount_pct"].round(1)
            records = records.round(2)
            no_discount = records[records["discount_band"] == "No discount"]
            high_discount = records[records["discount_band"] == "High (>20%)"]
            if not high_discount.empty:
                first = float(no_discount.iloc[0]["profit_margin_pct"]) if not no_discount.empty else float(records.iloc[0]["profit_margin_pct"])
                last = float(high_discount.iloc[0]["profit_margin_pct"])
                insight = (
                    f"Observed margin is {first:.1f}% at no discount and {last:.1f}% "
                    "above 20% discount. Compare the extra revenue with margin lost; "
                    "this is an association, not proof that discounts caused the change."
                )
            else:
                best = records.iloc[records["profit_margin_pct"].argmax()]
                worst = records.iloc[records["profit_margin_pct"].argmin()]
                insight = (
                    f"Best observed margin: {best['discount_band']} ({best['profit_margin_pct']:.1f}%); "
                    f"lowest: {worst['discount_band']} ({worst['profit_margin_pct']:.1f}%). "
                    "Use this as a pricing signal, not a causal estimate."
                )
            labels = {
                "profit_margin_pct": "Profit Margin",
                "revenue": "Revenue",
                "profit": "Profit",
                "transaction_count": "Transactions",
                "average_discount_pct": "Average Discount",
            }
            aggregations = {
                "profit_margin_pct": "Margin",
                "revenue": "Total",
                "profit": "Total",
                "transaction_count": "Count",
                "average_discount_pct": "Average",
            }
            currencies = {
                "profit_margin_pct": False,
                "revenue": True,
                "profit": True,
                "transaction_count": False,
                "average_discount_pct": False,
            }
            metadata = DataProfiler._metric_chart_metadata(labels, aggregations, currencies)
            return {
                "id": "chart_discount_effectiveness",
                "title": "Profit Margin vs. Discount Level",
                "subtitle": "Compare margin and sales volume across discount bands.",
                "insight": insight,
                "type": "bar",
                "category": "Pricing",
                "data": records.to_dict(orient="records"),
                "x_key": "discount_band",
                "y_key": "profit_margin_pct",
                **metadata,
            }
        except (KeyError, TypeError, ValueError):
            logger.warning("Unable to generate discount-effect chart", exc_info=True)
            return None

    @staticmethod
    def _is_identifier(column: Dict[str, Any], row_count: int) -> bool:
        name = DataProfiler._normalized_name(column["name"])
        if name in IDENTIFIER_TOKENS or name.endswith(" id"):
            return True
        if column.get("type") != "categorical":
            return False
        unique_count = column.get("unique_count", 0)
        return row_count >= 20 and unique_count / row_count >= 0.98

    @staticmethod
    def _metric_specs(df: pd.DataFrame, columns: list) -> List[Dict[str, Any]]:
        specs = []
        for column in columns:
            if column["type"] != "numeric" or DataProfiler._is_identifier(column, len(df)):
                continue
            normalized_name = DataProfiler._normalized_name(column["name"])
            if (
                DataProfiler._has_token(column["name"], NON_METRIC_TOKENS)
                or normalized_name.endswith(" code")
                or normalized_name.endswith("code")
                or normalized_name.endswith("direction")
            ):
                continue
            if column.get("unique_count", 0) <= 1:
                continue

            name = str(column["name"])
            is_non_additive = DataProfiler._has_token(name, NON_ADDITIVE_METRIC_TOKENS)
            aggregation = (
                "sum"
                if not is_non_additive and DataProfiler._has_token(name, ADDITIVE_METRIC_TOKENS)
                else "mean"
            )
            specs.append({
                "name": name,
                "aggregation": aggregation,
                "is_currency": DataProfiler._has_token(name, CURRENCY_TOKENS),
            })

        column_order = {column["name"]: index for index, column in enumerate(columns)}

        return sorted(
            specs,
            key=lambda spec: DataProfiler._metric_priority(
                spec, column_order[spec["name"]]
            ),
        )

    @staticmethod
    def _preferred_dimension(df: pd.DataFrame, columns: list) -> str | None:
        candidates = [
            column["name"]
            for column in columns
            if column["type"] == "categorical"
            and 1 < column.get("unique_count", 0) <= 30
            and not DataProfiler._is_identifier(column, len(df))
        ]
        if not candidates:
            return None
        return min(
            candidates,
            key=lambda name: (
                next(
                    (index for index, token in enumerate(PREFERRED_DIMENSION_TOKENS)
                     if token in str(name).lower().replace("_", " ")),
                    len(PREFERRED_DIMENSION_TOKENS),
                ),
                candidates.index(name),
            ),
        )

    @staticmethod
    def _format_metric_value(value: float, is_currency: bool) -> str:
        prefix = "$" if is_currency else ""
        return f"{prefix}{value:,.2f}"

    @staticmethod
    def _aggregate(series: pd.Series, aggregation: str) -> float:
        values = pd.to_numeric(series, errors="coerce").dropna()
        if values.empty:
            return 0.0
        return float(values.sum() if aggregation == "sum" else values.mean())

    @staticmethod
    def _time_series(
        df: pd.DataFrame,
        date_col: str,
        metric_specs: list,
    ) -> pd.DataFrame:
        temp = df.copy()
        temp[date_col] = pd.to_datetime(temp[date_col], errors="coerce")
        temp = temp.dropna(subset=[date_col])
        if temp.empty:
            return pd.DataFrame()

        temp["_period"] = temp[date_col].dt.to_period("M")
        aggregations = {
            spec["name"]: spec["aggregation"]
            for spec in metric_specs
        }
        if aggregations:
            result = temp.groupby("_period").agg(aggregations)
        else:
            result = temp.groupby("_period").size().to_frame("records")
        result = result.reset_index()
        result[date_col] = result["_period"].astype(str)
        return result.drop(columns=["_period"])

    @staticmethod
    def _calculate_sparkline(series: pd.Series, points: int = 7) -> List[float]:
        """Generate a normalized 7-point sparkline array from a numeric series."""
        clean = series.dropna()
        if len(clean) == 0:
            return [0.0] * points
        if len(clean) <= points:
            vals = [float(x) for x in clean]
            while len(vals) < points:
                vals.append(vals[-1] if vals else 0.0)
            return vals
        
        # Split into chunks and take mean of each chunk
        chunks = np.array_split(clean.values, points)
        return [round(float(chunk.mean()), 2) for chunk in chunks if len(chunk) > 0]

    @staticmethod
    def _calculate_summary_kpis(df: pd.DataFrame, columns: list) -> list:
        kpis = []
        metric_specs = DataProfiler._metric_specs(df, columns)
        date_cols = [column["name"] for column in columns if column["type"] == "date"]

        for spec in DataProfiler._select_diverse_metrics(
            metric_specs, DataProfiler.KPI_LIMIT
        ):
            col_name = spec["name"]
            series = pd.to_numeric(df[col_name], errors='coerce').dropna()
            if series.empty:
                continue

            value = DataProfiler._aggregate(series, spec["aggregation"])
            trend_data = pd.DataFrame()
            if date_cols:
                trend_data = DataProfiler._time_series(df, date_cols[0], [spec])
            sparkline = (
                DataProfiler._calculate_sparkline(trend_data[col_name], 7)
                if len(trend_data) >= 2
                else []
            )
            first_value = float(trend_data[col_name].iloc[0]) if len(trend_data) >= 2 else None
            last_value = float(trend_data[col_name].iloc[-1]) if len(trend_data) >= 2 else None
            delta_pct = (
                round(((last_value - first_value) / abs(first_value)) * 100, 1)
                if first_value not in (None, 0)
                else None
            )

            kpis.append({
                "id": f"kpi_{col_name}",
                "name": col_name,
                "title": DataProfiler._metric_label(col_name),
                "aggregation": DataProfiler._aggregation_label(spec["aggregation"]),
                "value": round(value, 2),
                "max": round(float(series.max()), 2),
                "min": round(float(series.min()), 2),
                "sparkline": sparkline,
                "trend": "up" if delta_pct is not None and delta_pct >= 0 else "down",
                "delta_pct": abs(delta_pct) if delta_pct is not None else None,
                "is_currency": spec["is_currency"],
                "count": int(len(series)),
            })

        return kpis

    @staticmethod
    def _generate_smart_narratives(df: pd.DataFrame, columns: list, kpis: list) -> list:
        narratives = []
        metric_specs = DataProfiler._metric_specs(df, columns)
        category_col = DataProfiler._preferred_dimension(df, columns)
        date_cols = [c['name'] for c in columns if c['type'] == 'date']

        if kpis:
            primary_kpi = kpis[0]
            value_fmt = DataProfiler._format_metric_value(
                primary_kpi["value"], primary_kpi["is_currency"]
            )
            narratives.append({
                "type": "headline",
                "badge": "Key Metric",
                "text": (
                    f"{primary_kpi['aggregation']} {primary_kpi['title']} is {value_fmt} "
                    f"across {primary_kpi['count']:,} valid records."
                ),
            })

        if category_col and metric_specs:
            metric = metric_specs[0]
            num_col = metric["name"]
            try:
                grouped = df.groupby(category_col, dropna=True)[num_col].agg(metric["aggregation"])
                grouped = grouped.sort_values(ascending=False)
                if not grouped.empty:
                    top_name = str(grouped.index[0])
                    top_val = float(grouped.iloc[0])
                    aggregation_title = DataProfiler._aggregation_label(metric["aggregation"]).lower()
                    formatted_value = DataProfiler._format_metric_value(top_val, metric["is_currency"])
                    narratives.append({
                        "type": "driver",
                        "badge": "Segment Insight",
                        "text": (
                            f"'{top_name}' has the highest {aggregation_title} "
                            f"{DataProfiler._metric_label(num_col)} by "
                            f"{category_col.replace('_', ' ').title()} "
                            f"({formatted_value})."
                        ),
                    })
            except (KeyError, TypeError, ValueError):
                logger.warning("Unable to generate category narrative for %s", category_col, exc_info=True)

        if date_cols and metric_specs:
            date_col = date_cols[0]
            metric = metric_specs[0]
            num_col = metric["name"]
            try:
                monthly = DataProfiler._time_series(df, date_col, [metric])
                if len(monthly) >= 2:
                    first_value = float(monthly[num_col].iloc[0])
                    last_value = float(monthly[num_col].iloc[-1])
                    if first_value != 0:
                        growth = round((last_value - first_value) / abs(first_value) * 100, 1)
                        direction = "increased" if growth >= 0 else "decreased"
                        narratives.append({
                            "type": "trend",
                            "badge": "Period Trend",
                            "text": (
                                f"{DataProfiler._aggregation_label(metric['aggregation'])} "
                                f"{DataProfiler._metric_label(num_col)} "
                                f"{direction} by {abs(growth)}% from {monthly[date_col].iloc[0]} "
                                f"to {monthly[date_col].iloc[-1]}."
                            ),
                        })
            except (KeyError, TypeError, ValueError):
                logger.warning("Unable to generate time narrative for %s", date_col, exc_info=True)

        health = DataProfiler._calculate_data_quality(df)
        completeness_pct = round(
            100 - (health["missing_cells"] / (len(df) * len(df.columns)) * 100), 1
        ) if len(df) * len(df.columns) > 0 else 100.0
        narratives.append({
            "type": "quality",
            "badge": "Data Health",
            "text": (
                f"Dataset completeness is {completeness_pct}% with "
                f"{health['invalid_values']} out-of-range values and "
                f"{health['duplicate_rows']} duplicate rows detected."
            ),
        })

        return narratives

    @staticmethod
    def _generate_default_charts(df: pd.DataFrame, columns: list) -> list:
        charts = []
        metric_specs = DataProfiler._metric_specs(df, columns)
        numeric_cols = [spec["name"] for spec in metric_specs]
        date_cols = [c['name'] for c in columns if c['type'] == 'date']
        revenue_col = DataProfiler._find_metric(
            metric_specs, ("revenue", "sales", "turnover")
        )
        profit_col = DataProfiler._find_metric(
            metric_specs, ("profit", "earnings")
        )
        discount_col = DataProfiler._find_metric(
            metric_specs, ("discount", "markdown")
        )
        has_profitability_metrics = bool(revenue_col and profit_col)

        if date_cols:
            date_col = date_cols[0]
            try:
                time_metrics = DataProfiler._select_diverse_metrics(
                    metric_specs, DataProfiler.KPI_LIMIT
                )
                trend = DataProfiler._time_series(df, date_col, time_metrics)
                if not trend.empty:
                    y_key = time_metrics[0]["name"] if time_metrics else "records"
                    for spec in time_metrics:
                        trend[spec["name"]] = pd.to_numeric(trend[spec["name"]], errors="coerce").round(2)
                    charts.append({
                        "id": "chart_trend_main",
                        "title": (
                            f"Monthly {DataProfiler._aggregation_label(time_metrics[0]['aggregation'])} "
                            f"{DataProfiler._metric_label(y_key)}"
                            if time_metrics else "Records Over Time"
                        ),
                        "subtitle": f"Monthly trend by {date_col.replace('_', ' ').title()}",
                        "type": "line",
                        "category": "Time Trend",
                        "data": trend.to_dict(orient="records"),
                        "x_key": date_col,
                        "y_key": y_key,
                        "available_metrics": [spec["name"] for spec in time_metrics] or ["records"],
                        "is_currency": time_metrics[0]["is_currency"] if time_metrics else False,
                        "metric_currency": {
                            spec["name"]: spec["is_currency"] for spec in time_metrics
                        },
                        "metric_aggregations": {
                            spec["name"]: DataProfiler._aggregation_label(spec["aggregation"])
                            for spec in time_metrics
                        },
                        "metric_labels": {
                            spec["name"]: DataProfiler._metric_label(spec["name"])
                            for spec in time_metrics
                        },
                        "insight": (
                            f"{DataProfiler._metric_label(y_key)} changed from "
                            f"{float(trend.iloc[0][y_key]):,.2f} to "
                            f"{float(trend.iloc[-1][y_key]):,.2f} across the period."
                            if len(trend) > 1 else None
                        ),
                    })
            except (KeyError, TypeError, ValueError):
                logger.warning("Failed to generate date trend chart for %s", date_col, exc_info=True)

        business_charts = []
        if has_profitability_metrics:
            if discount_col:
                discount_chart = DataProfiler._discount_effect_chart(
                    df, discount_col, revenue_col, profit_col
                )
                if discount_chart:
                    business_charts.append(discount_chart)

            for dimension in DataProfiler._business_dimensions(columns, df):
                chart = DataProfiler._profitability_chart(
                    df, dimension, revenue_col, profit_col, discount_col
                )
                if chart:
                    business_charts.append(chart)
            charts.extend(business_charts)

        if not has_profitability_metrics:
            category_col = DataProfiler._preferred_dimension(df, columns)
        else:
            category_col = None

        if category_col:
            try:
                counts = df.groupby(category_col, dropna=True).size().sort_values(ascending=False)
                total_count = int(counts.sum())
                distribution = pd.DataFrame({
                    category_col: counts.index.astype(str),
                    "value": counts.values,
                }).head(8)
                distribution["percentage"] = (
                    distribution["value"] / total_count * 100
                ).round(1)
                if not distribution.empty:
                    charts.append({
                        "id": "chart_category_distribution",
                        "title": f"Record Mix by {category_col.replace('_', ' ').title()}",
                        "subtitle": "Share of records in each segment",
                        "type": "donut",
                        "category": "Segment Mix",
                        "data": distribution.to_dict(orient="records"),
                        "x_key": category_col,
                        "y_key": "value",
                        "name_key": category_col,
                        "total_sum": total_count,
                        "available_metrics": ["value"],
                        "is_currency": False,
                    })

                if metric_specs:
                    selected_metrics = DataProfiler._select_diverse_metrics(
                        metric_specs, DataProfiler.KPI_LIMIT
                    )
                    primary_metric = selected_metrics[0]
                    metric_col = primary_metric["name"]
                    metric_aggregations = {
                        spec["name"]: spec["aggregation"] for spec in selected_metrics
                    }
                    grouped = df.groupby(category_col, dropna=True).agg(metric_aggregations)
                    grouped = grouped.sort_values(by=metric_col, ascending=False).head(10)
                    breakdown = grouped.reset_index()
                    breakdown[category_col] = breakdown[category_col].astype(str)
                    if not breakdown.empty:
                        charts.append({
                            "id": "chart_category_metric",
                            "title": (
                                f"{DataProfiler._aggregation_label(primary_metric['aggregation'])} "
                                f"{DataProfiler._metric_label(metric_col)} by "
                                f"{category_col.replace('_', ' ').title()}"
                            ),
                            "subtitle": (
                                f"Compare {category_col.replace('_', ' ').title()} "
                                f"segments by {DataProfiler._metric_label(metric_col)}"
                            ),
                            "type": "bar",
                            "category": "Segment Performance",
                            "data": breakdown.round({
                                spec["name"]: 2 for spec in selected_metrics
                            }).to_dict(orient="records"),
                            "x_key": category_col,
                            "y_key": metric_col,
                            "available_metrics": [spec["name"] for spec in selected_metrics],
                            "is_currency": primary_metric["is_currency"],
                            "metric_currency": {
                                spec["name"]: spec["is_currency"] for spec in selected_metrics
                            },
                            "metric_aggregations": {
                                spec["name"]: DataProfiler._aggregation_label(spec["aggregation"])
                                for spec in selected_metrics
                            },
                            "metric_labels": {
                                spec["name"]: DataProfiler._metric_label(spec["name"])
                                for spec in selected_metrics
                            },
                        })
            except (KeyError, TypeError, ValueError):
                logger.warning("Failed to generate category charts for %s", category_col, exc_info=True)

        if not charts and metric_specs:
            metric = metric_specs[0]
            values = pd.to_numeric(df[metric["name"]], errors="coerce").dropna()
            if values.nunique() > 1:
                counts, edges = np.histogram(values, bins=min(8, values.nunique()))
                histogram = [
                    {
                        "range": f"{edges[index]:,.2f} - {edges[index + 1]:,.2f}",
                        "records": int(count),
                    }
                    for index, count in enumerate(counts)
                ]
                charts.append({
                    "id": "chart_metric_distribution",
                    "title": f"{DataProfiler._metric_label(metric['name'])} Distribution",
                    "subtitle": "Record frequency across value ranges",
                    "type": "bar",
                    "category": "Distribution",
                    "data": histogram,
                    "x_key": "range",
                    "y_key": "records",
                    "available_metrics": ["records"],
                    "is_currency": False,
                })

        return charts

    @staticmethod
    def _extract_dimensions(df: pd.DataFrame, columns: list) -> Dict[str, List[str]]:
        dimensions = {}
        categorical_cols = [
            c['name'] for c in columns
            if c['type'] == 'categorical'
            and c['unique_count'] <= 50
            and not DataProfiler._is_identifier(c, len(df))
        ]
        for col in categorical_cols:
            unique_vals = [str(x) for x in df[col].dropna().unique() if str(x).strip()]
            dimensions[col] = sorted(unique_vals[:30])
        return dimensions

    @staticmethod
    def profile_dataset(file_path: str) -> Dict[str, Any]:
        """Profiles a dataset with rich Power BI summary stats and visual models."""
        try:
            from app.utils.file_loader import load_dataset_dataframe
            df = load_dataset_dataframe(file_path)

            row_count = len(df)
            col_count = len(df.columns)
            
            columns = []
            for col in df.columns:
                col_data = df[col]
                dtype_str = str(col_data.dtype)
                
                is_date = False
                if pd.api.types.is_datetime64_any_dtype(col_data):
                    is_date = True
                elif dtype_str == 'object':
                    try:
                        sample = col_data.dropna().head(10)
                        if not sample.empty and all(isinstance(x, str) and (len(x) > 6) for x in sample):
                            pd.to_datetime(sample)
                            is_date = True
                    except Exception:
                        pass
                
                col_info = {
                    "name": col,
                    "type": "date" if is_date else dtype_str,
                    "missing_count": int(col_data.isna().sum()),
                    "missing_percentage": float((col_data.isna().sum() / row_count) * 100) if row_count > 0 else 0,
                    "unique_count": int(col_data.nunique())
                }
                
                if pd.api.types.is_numeric_dtype(col_data) and not is_date:
                    col_info["type"] = "numeric"
                    clean_series = pd.to_numeric(col_data, errors='coerce').dropna()
                    if not clean_series.empty:
                        col_info["stats"] = {
                            "min": round(float(clean_series.min()), 2),
                            "max": round(float(clean_series.max()), 2),
                            "mean": round(float(clean_series.mean()), 2),
                            "median": round(float(clean_series.median()), 2),
                            "sum": round(float(clean_series.sum()), 2)
                        }
                elif dtype_str == 'object' and not is_date:
                    col_info["type"] = "categorical"
                
                columns.append(col_info)

            health = DataProfiler._calculate_data_quality(df)
            data_quality_score = health["score"]
            
            # Enhanced KPI, narrative, and chart generators
            summary_kpis = DataProfiler._calculate_summary_kpis(df, columns)
            smart_narratives = DataProfiler._generate_smart_narratives(df, columns, summary_kpis)
            charts = DataProfiler._generate_default_charts(df, columns)
            dimensions = DataProfiler._extract_dimensions(df, columns)

            return {
                "row_count": row_count,
                "col_count": col_count,
                "data_quality_score": round(data_quality_score, 1),
                "profile_data": {
                    "analytics_version": DataProfiler.ANALYTICS_VERSION,
                    "columns": columns,
                    "duplicate_rows": health["duplicate_rows"],
                    "invalid_values": health["invalid_values"],
                    "summary_kpis": summary_kpis,
                    "smart_narratives": smart_narratives,
                    "default_charts": charts,
                    "dimensions": dimensions
                }
            }
        except Exception as e:
            logger.error(f"Failed to profile dataset: {str(e)}")
            raise
