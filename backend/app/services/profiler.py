import pandas as pd
import numpy as np
import json
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class DataProfiler:
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
        numeric_cols = [c['name'] for c in columns if c['type'] == 'numeric']
        date_cols = [c['name'] for c in columns if c['type'] == 'date']
        
        for col_name in numeric_cols[:4]:
            series = pd.to_numeric(df[col_name], errors='coerce').dropna()
            if series.empty:
                continue
                
            total_sum = float(series.sum())
            avg_val = float(series.mean())
            max_val = float(series.max())
            min_val = float(series.min())
            sparkline = DataProfiler._calculate_sparkline(series, 7)
            
            # Estimate trend from sparkline
            trend = "up" if len(sparkline) >= 2 and sparkline[-1] >= sparkline[0] else "down"
            delta_pct = round(((sparkline[-1] - sparkline[0]) / (sparkline[0] if sparkline[0] != 0 else 1)) * 100, 1)
            
            # Format title
            clean_title = col_name.replace('_', ' ').title()
            
            # Heuristic formatting
            is_currency = any(k in col_name.lower() for k in ['sale', 'revenue', 'price', 'profit', 'cost', 'amount', 'total', 'fee', 'spend'])
            
            kpis.append({
                "id": f"kpi_{col_name}",
                "name": col_name,
                "title": clean_title,
                "sum": round(total_sum, 2),
                "avg": round(avg_val, 2),
                "max": round(max_val, 2),
                "min": round(min_val, 2),
                "sparkline": sparkline,
                "trend": trend,
                "delta_pct": abs(delta_pct),
                "is_currency": is_currency,
                "count": int(len(series))
            })
            
        return kpis

    @staticmethod
    def _generate_smart_narratives(df: pd.DataFrame, columns: list, kpis: list) -> list:
        narratives = []
        numeric_cols = [c['name'] for c in columns if c['type'] == 'numeric']
        categorical_cols = [c['name'] for c in columns if c['type'] == 'categorical']
        date_cols = [c['name'] for c in columns if c['type'] == 'date']
        
        # 1. Total Volume / Top KPI highlight
        if kpis:
            primary_kpi = kpis[0]
            prefix = "$" if primary_kpi["is_currency"] else ""
            sum_fmt = f"{prefix}{primary_kpi['sum']:,.2f}"
            narratives.append({
                "type": "headline",
                "badge": "Primary Metric",
                "text": f"Total {primary_kpi['title']} reached {sum_fmt} across {len(df):,} total records, averaging {prefix}{primary_kpi['avg']:,.2f} per transaction."
            })
        
        # 2. Top Categorical Driver
        if categorical_cols and numeric_cols:
            cat_col = categorical_cols[0]
            num_col = numeric_cols[0]
            try:
                grouped = df.groupby(cat_col)[num_col].sum().sort_values(ascending=False)
                if not grouped.empty:
                    top_name = str(grouped.index[0])
                    top_val = float(grouped.iloc[0])
                    total_val = float(grouped.sum())
                    pct_share = round((top_val / total_val * 100), 1) if total_val > 0 else 0
                    prefix = "$" if any(k in num_col.lower() for k in ['sale', 'revenue', 'profit', 'price', 'cost']) else ""
                    narratives.append({
                        "type": "driver",
                        "badge": "Key Driver",
                        "text": f"'{top_name}' leads {cat_col.replace('_', ' ').title()} with {prefix}{top_val:,.2f} ({pct_share}% of total {num_col.replace('_', ' ').title()})."
                    })
            except Exception:
                pass
                
        # 3. Secondary dimension breakdown (e.g. Region or Segment)
        if len(categorical_cols) > 1 and numeric_cols:
            sec_cat = categorical_cols[1]
            num_col = numeric_cols[0]
            try:
                sec_grouped = df.groupby(sec_cat)[num_col].sum().sort_values(ascending=False)
                if not sec_grouped.empty:
                    top_sec = str(sec_grouped.index[0])
                    sec_val = float(sec_grouped.iloc[0])
                    narratives.append({
                        "type": "distribution",
                        "badge": "Segment Lead",
                        "text": f"Top performing {sec_cat.replace('_', ' ').title()} is '{top_sec}' contributing {sec_val:,.2f}."
                    })
            except Exception:
                pass
                
        # 4. Time Trend / Period Insight
        if date_cols and numeric_cols:
            date_col = date_cols[0]
            num_col = numeric_cols[0]
            try:
                df_temp = df.copy()
                df_temp[date_col] = pd.to_datetime(df_temp[date_col], errors='coerce')
                df_temp = df_temp.dropna(subset=[date_col])
                if not df_temp.empty:
                    monthly = df_temp.groupby(df_temp[date_col].dt.to_period("M"))[num_col].sum()
                    if len(monthly) >= 2:
                        first_m = monthly.iloc[0]
                        last_m = monthly.iloc[-1]
                        growth = round(((last_m - first_m) / (first_m if first_m != 0 else 1)) * 100, 1)
                        direction = "expanded by" if growth >= 0 else "declined by"
                        narratives.append({
                            "type": "trend",
                            "badge": "Growth Trend",
                            "text": f"{num_col.replace('_', ' ').title()} {direction} {abs(growth)}% from {monthly.index[0]} to {monthly.index[-1]}."
                        })
            except Exception:
                pass

        # 5. Data Completeness & Quality Insight
        dup_count = int(df.duplicated().sum())
        total_cells = len(df) * len(df.columns)
        null_cells = int(df.isna().sum().sum())
        completeness_pct = round(100 - (null_cells / total_cells * 100), 1) if total_cells > 0 else 100.0
        narratives.append({
            "type": "quality",
            "badge": "Data Health",
            "text": f"Dataset completeness is {completeness_pct}% with {dup_count} duplicate rows detected across {len(df.columns)} features."
        })

        return narratives

    @staticmethod
    def _generate_default_charts(df: pd.DataFrame, columns: list) -> list:
        charts = []
        numeric_cols = [c['name'] for c in columns if c['type'] == 'numeric']
        categorical_cols = [c['name'] for c in columns if c['type'] == 'categorical' and c['unique_count'] <= 30]
        date_cols = [c['name'] for c in columns if c['type'] == 'date']
        
        # 1. Primary Time Series Trend (Date vs Multi-Numeric)
        if date_cols and numeric_cols:
            date_col = date_cols[0]
            try:
                df_temp = df.copy()
                df_temp[date_col] = pd.to_datetime(df_temp[date_col], errors='coerce')
                df_temp = df_temp.dropna(subset=[date_col]).sort_values(by=date_col)
                
                # Monthly aggregation
                agg_dict = {col: 'sum' for col in numeric_cols[:3]}
                trend = df_temp.groupby(df_temp[date_col].dt.to_period("M")).agg(agg_dict).reset_index()
                trend[date_col] = trend[date_col].astype(str)
                
                # Fill missing or format
                data_records = trend.to_dict(orient="records")
                for r in data_records:
                    for num_c in numeric_cols[:3]:
                        if num_c in r and (pd.isna(r[num_c]) or np.isinf(r[num_c])):
                            r[num_c] = 0
                        elif num_c in r:
                            r[num_c] = round(float(r[num_c]), 2)
                
                charts.append({
                    "id": "chart_trend_main",
                    "title": f"Periodic {numeric_cols[0].replace('_', ' ').title()} Performance",
                    "subtitle": f"Monthly progression and trend curve for {', '.join([c.replace('_', ' ').title() for c in numeric_cols[:2]])}",
                    "type": "area",
                    "category": "Time Series",
                    "data": data_records,
                    "x_key": date_col,
                    "y_key": numeric_cols[0],
                    "secondary_y_key": numeric_cols[1] if len(numeric_cols) > 1 else None,
                    "available_metrics": numeric_cols
                })
            except Exception as e:
                logger.warning(f"Failed to generate trend chart: {e}")

        # 2. Top Categorical Ranked Bar Chart (e.g. Category or Product by Primary Numeric)
        if categorical_cols and numeric_cols:
            cat_col = categorical_cols[0]
            num_col = numeric_cols[0]
            try:
                agg_dict = {col: 'sum' for col in numeric_cols[:2]}
                bar_df = df.groupby(cat_col).agg(agg_dict).reset_index().sort_values(by=num_col, ascending=False).head(10)
                
                total_metric = bar_df[num_col].sum()
                records = bar_df.to_dict(orient="records")
                for r in records:
                    r[num_col] = round(float(r[num_col]), 2)
                    r["share_pct"] = round((float(r[num_col]) / total_metric * 100), 1) if total_metric > 0 else 0
                    if len(numeric_cols) > 1 and numeric_cols[1] in r:
                        r[numeric_cols[1]] = round(float(r[numeric_cols[1]]), 2)

                charts.append({
                    "id": "chart_category_bar",
                    "title": f"Top {cat_col.replace('_', ' ').title()} Ranking",
                    "subtitle": f"Comparative breakdown of {num_col.replace('_', ' ').title()} by {cat_col.replace('_', ' ').title()}",
                    "type": "bar",
                    "category": "Ranking",
                    "data": records,
                    "x_key": cat_col,
                    "y_key": num_col,
                    "secondary_y_key": numeric_cols[1] if len(numeric_cols) > 1 else None,
                    "available_metrics": numeric_cols
                })
            except Exception as e:
                logger.warning(f"Failed to generate bar chart: {e}")

        # 3. Donut / Composition Chart (Secondary Categorical or First Categorical)
        comp_cat = categorical_cols[1] if len(categorical_cols) > 1 else (categorical_cols[0] if categorical_cols else None)
        if comp_cat and numeric_cols:
            num_col = numeric_cols[0]
            try:
                donut_df = df.groupby(comp_cat)[num_col].sum().reset_index().sort_values(by=num_col, ascending=False).head(7)
                total_val = donut_df[num_col].sum()
                donut_records = []
                for _, row in donut_df.iterrows():
                    val = round(float(row[num_col]), 2)
                    pct = round((val / total_val * 100), 1) if total_val > 0 else 0
                    donut_records.append({
                        "name": str(row[comp_cat]),
                        comp_cat: str(row[comp_cat]),
                        "value": val,
                        num_col: val,
                        "percentage": pct
                    })
                
                charts.append({
                    "id": "chart_composition_donut",
                    "title": f"{comp_cat.replace('_', ' ').title()} Market Share",
                    "subtitle": f"Proportional share of total {num_col.replace('_', ' ').title()}",
                    "type": "donut",
                    "category": "Distribution",
                    "data": donut_records,
                    "x_key": comp_cat,
                    "y_key": "value",
                    "name_key": comp_cat,
                    "total_sum": round(float(total_val), 2),
                    "available_metrics": numeric_cols
                })
            except Exception as e:
                logger.warning(f"Failed to generate donut chart: {e}")

        # 4. Multi-Metric Composed Chart (Bar + Line comparison e.g. Sales & Profit)
        if len(numeric_cols) >= 2 and categorical_cols:
            cat_dim = categorical_cols[0]
            m1 = numeric_cols[0]
            m2 = numeric_cols[1]
            try:
                comp_df = df.groupby(cat_dim)[[m1, m2]].sum().reset_index().sort_values(by=m1, ascending=False).head(8)
                comp_records = comp_df.to_dict(orient="records")
                for r in comp_records:
                    r[m1] = round(float(r[m1]), 2)
                    r[m2] = round(float(r[m2]), 2)
                    
                charts.append({
                    "id": "chart_composed_multimetric",
                    "title": f"{m1.replace('_', ' ').title()} vs {m2.replace('_', ' ').title()} by {cat_dim.replace('_', ' ').title()}",
                    "subtitle": f"Multi-series cross analysis across top {cat_dim.replace('_', ' ').title()} segments",
                    "type": "composed",
                    "category": "Multi-Metric",
                    "data": comp_records,
                    "x_key": cat_dim,
                    "y_key": m1,
                    "secondary_y_key": m2,
                    "available_metrics": numeric_cols
                })
            except Exception as e:
                logger.warning(f"Failed to generate composed chart: {e}")

        # 5. Third dimension breakdown or fallback distribution if available
        if len(categorical_cols) >= 3 and numeric_cols:
            third_cat = categorical_cols[2]
            num_col = numeric_cols[0]
            try:
                sub_df = df.groupby(third_cat)[num_col].sum().reset_index().sort_values(by=num_col, ascending=False).head(6)
                sub_records = sub_df.to_dict(orient="records")
                for r in sub_records:
                    r[num_col] = round(float(r[num_col]), 2)
                    
                charts.append({
                    "id": "chart_third_dimension",
                    "title": f"{num_col.replace('_', ' ').title()} by {third_cat.replace('_', ' ').title()}",
                    "subtitle": f"Volume split across {third_cat.replace('_', ' ').title()}",
                    "type": "bar",
                    "category": "Ranking",
                    "data": sub_records,
                    "x_key": third_cat,
                    "y_key": num_col,
                    "available_metrics": numeric_cols
                })
            except Exception as e:
                logger.warning(f"Failed to generate 3rd chart: {e}")

        return charts

    @staticmethod
    def _extract_dimensions(df: pd.DataFrame, columns: list) -> Dict[str, List[str]]:
        dimensions = {}
        categorical_cols = [c['name'] for c in columns if c['type'] == 'categorical' and c['unique_count'] <= 50]
        for col in categorical_cols:
            unique_vals = [str(x) for x in df[col].dropna().unique() if str(x).strip()]
            dimensions[col] = sorted(unique_vals[:30])
        return dimensions

    @staticmethod
    def profile_dataset(file_path: str) -> Dict[str, Any]:
        """Profiles a dataset with rich Power BI summary stats and visual models."""
        try:
            if file_path.endswith('.csv'):
                df = pd.read_csv(file_path)
            elif file_path.endswith('.xlsx'):
                df = pd.read_excel(file_path)
            else:
                raise ValueError("Unsupported file format")

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

            total_missing = sum(c["missing_count"] for c in columns)
            total_cells = row_count * col_count
            missing_penalty = (total_missing / total_cells) * 100 if total_cells > 0 else 0
            data_quality_score = max(0.0, min(100.0, 100.0 - (missing_penalty * 2)))
            
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
                    "columns": columns,
                    "duplicate_rows": int(df.duplicated().sum()),
                    "summary_kpis": summary_kpis,
                    "smart_narratives": smart_narratives,
                    "default_charts": charts,
                    "dimensions": dimensions
                }
            }
        except Exception as e:
            logger.error(f"Failed to profile dataset: {str(e)}")
            raise
