import os
import tempfile
import unittest

import pandas as pd

from app.services.profiler import DataProfiler


class ProfilerAnalyticsTests(unittest.TestCase):
    def test_uses_averages_for_non_additive_metrics_and_sums_for_revenue(self):
        frame = pd.DataFrame({
            "customer_id": [1, 2, 3, 4, 5, 6],
            "year": [2025, 2025, 2025, 2025, 2025, 2025],
            "order_date": [
                "2025-01-10", "2025-01-14", "2025-02-10",
                "2025-02-14", "2025-03-10", "2025-03-14",
            ],
            "region": ["North", "South", "North", "South", "North", "South"],
            "total_age": [20, 40, 30, 50, 40, 60],
            "total_temperature": [10, 20, 15, 25, 20, 30],
            "revenue": [100, 200, 300, 400, 500, 600],
        })

        with tempfile.TemporaryDirectory() as directory:
            file_path = os.path.join(directory, "sales.csv")
            frame.to_csv(file_path, index=False)
            result = DataProfiler.profile_dataset(file_path)

        self.assertEqual(
            result["profile_data"]["analytics_version"],
            DataProfiler.ANALYTICS_VERSION,
        )
        kpis = {kpi["name"]: kpi for kpi in result["profile_data"]["summary_kpis"]}
        self.assertNotIn("customer_id", kpis)
        self.assertNotIn("year", kpis)
        self.assertEqual(kpis["revenue"]["aggregation"], "Total")
        self.assertEqual(kpis["revenue"]["value"], 2100.0)
        self.assertEqual(kpis["total_age"]["aggregation"], "Average")
        self.assertEqual(kpis["total_age"]["title"], "Age")
        self.assertEqual(kpis["total_age"]["value"], 40.0)
        self.assertEqual(kpis["total_temperature"]["aggregation"], "Average")
        self.assertEqual(kpis["total_temperature"]["title"], "Temperature")
        self.assertEqual(kpis["total_temperature"]["value"], 20.0)

    def test_charts_break_down_categories_using_mean_for_age(self):
        frame = pd.DataFrame({
            "region": ["North", "North", "South", "South"],
            "total_age": [20, 40, 30, 50],
            "revenue": [100, 300, 200, 400],
        })
        columns = [
            {"name": "region", "type": "categorical", "unique_count": 2},
            {"name": "total_age", "type": "numeric", "unique_count": 4},
            {"name": "revenue", "type": "numeric", "unique_count": 4},
        ]

        charts = DataProfiler._generate_default_charts(frame, columns)
        age_chart = next(
            chart for chart in charts
            if chart["id"] == "chart_category_metric"
        )
        self.assertEqual(age_chart["y_key"], "revenue")
        averages_by_region = {
            row["region"]: row["total_age"] for row in age_chart["data"]
        }
        self.assertEqual(averages_by_region, {"North": 30.0, "South": 40.0})
        self.assertIn("records", next(
            chart for chart in charts if chart["id"] == "chart_category_distribution"
        )["subtitle"].lower())

    def test_kpis_do_not_show_fake_period_deltas_without_dates(self):
        frame = pd.DataFrame({"age": [20, 30, 40]})
        columns = [{"name": "age", "type": "numeric", "unique_count": 3}]

        kpis = DataProfiler._calculate_summary_kpis(frame, columns)

        self.assertEqual(len(kpis), 1)
        self.assertIsNone(kpis[0]["delta_pct"])
        self.assertEqual(kpis[0]["sparkline"], [])

    def test_high_cardinality_numeric_revenue_is_not_treated_as_an_identifier(self):
        frame = pd.DataFrame({
            "revenue": [float(index) + 0.25 for index in range(100)],
            "profit": [float(index) * 0.2 for index in range(100)],
        })
        columns = [
            {"name": name, "type": "numeric", "unique_count": 100}
            for name in frame.columns
        ]

        metric_names = [
            spec["name"] for spec in DataProfiler._metric_specs(frame, columns)
        ]

        self.assertEqual(metric_names[:2], ["revenue", "profit"])

    def test_kpis_prioritize_sales_volume_over_cost_totals(self):
        frame = pd.DataFrame({
            "revenue": [100, 200, 300],
            "profit": [20, 40, 60],
            "unit_cost": [50, 100, 150],
            "quantity": [1, 2, 3],
        })
        columns = [
            {"name": name, "type": "numeric", "unique_count": 3}
            for name in frame.columns
        ]

        kpis = DataProfiler._calculate_summary_kpis(frame, columns)

        self.assertEqual(
            [kpi["name"] for kpi in kpis],
            ["revenue", "profit", "quantity"],
        )

    def test_kpis_choose_distinct_weather_metrics_and_sum_precipitation(self):
        frame = pd.DataFrame({
            "temperature_2m_max": [28, 30, 32],
            "temperature_2m_min": [20, 22, 24],
            "temperature_2m_mean": [24, 26, 28],
            "precipitation_sum": [2, 3, 5],
            "rain_sum": [1, 2, 3],
            "windspeed_10m_max": [10, 20, 30],
            "winddirection_10m_dominant": [350, 0, 10],
            "weathercode": [1, 2, 3],
        })
        columns = [
            {"name": name, "type": "numeric", "unique_count": int(frame[name].nunique())}
            for name in frame.columns
        ]

        kpis = DataProfiler._calculate_summary_kpis(frame, columns)

        self.assertEqual(
            [kpi["name"] for kpi in kpis],
            ["temperature_2m_max", "precipitation_sum", "windspeed_10m_max"],
        )
        self.assertEqual(kpis[0]["aggregation"], "Average")
        self.assertEqual(kpis[1]["aggregation"], "Total")
        self.assertEqual(kpis[1]["value"], 10.0)
        self.assertEqual(kpis[2]["aggregation"], "Average")

    def test_profitability_charts_compare_margin_by_business_dimension(self):
        frame = pd.DataFrame({
            "category": ["Electronics", "Electronics", "Home", "Home"],
            "revenue": [100, 100, 100, 100],
            "profit": [30, 20, 10, 10],
            "discount_pct": [0.05, 0.1, 0.15, 0.2],
        })

        chart = DataProfiler._profitability_chart(
            frame, "category", "revenue", "profit", "discount_pct"
        )

        self.assertEqual(chart["category"], "Profitability")
        self.assertEqual(chart["y_key"], "profit_margin_pct")
        self.assertEqual(chart["available_metrics"], [
            "profit_margin_pct", "revenue", "profit", "transaction_count",
            "average_discount_pct",
        ])
        margins = {row["category"]: row["profit_margin_pct"] for row in chart["data"]}
        self.assertEqual(margins, {"Electronics": 25.0, "Home": 10.0})
        discounts = {row["category"]: row["average_discount_pct"] for row in chart["data"]}
        self.assertEqual(discounts, {"Electronics": 7.5, "Home": 17.5})
        self.assertIn("Highest margin: Electronics", chart["insight"])

    def test_discount_chart_compares_observed_margin_by_band(self):
        frame = pd.DataFrame({
            "discount_pct": [0.0, 0.0, 0.05, 0.05, 0.15, 0.15, 0.25, 0.25],
            "revenue": [100] * 8,
            "profit": [40, 40, 35, 35, 25, 25, 15, 15],
        })

        chart = DataProfiler._discount_effect_chart(
            frame, "discount_pct", "revenue", "profit"
        )

        self.assertEqual(chart["category"], "Pricing")
        self.assertEqual(chart["y_key"], "profit_margin_pct")
        self.assertEqual(
            [row["profit_margin_pct"] for row in chart["data"]],
            [40.0, 35.0, 25.0, 15.0],
        )
        self.assertIn("not proof", chart["insight"])

    def test_data_quality_score_accounts_for_missing_invalid_and_duplicate_values(self):
        frame = pd.DataFrame({
            "discount_pct": [0.0, 0.1, 0.2, 0.3, 0.3, None],
            "unit_price": [5, 4, 3, 2, 2, -9],
        })

        quality = DataProfiler._calculate_data_quality(frame)

        self.assertEqual(quality["missing_cells"], 1)
        self.assertEqual(quality["invalid_values"], 1)
        self.assertEqual(quality["duplicate_rows"], 1)
        self.assertEqual(quality["score"], 71.7)


if __name__ == "__main__":
    unittest.main()
