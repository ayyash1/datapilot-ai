import pandas as pd
import numpy as np
import json
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class DataProfiler:
    @staticmethod
    def _generate_default_charts(df: pd.DataFrame, columns: list) -> list:
        charts = []
        numeric_cols = [c['name'] for c in columns if c['type'] == 'numeric']
        categorical_cols = [c['name'] for c in columns if c['type'] == 'categorical' and c['unique_count'] <= 20]
        date_cols = [c['name'] for c in columns if c['type'] == 'date']
        
        # 1. Trend chart (Date vs Numeric)
        if date_cols and numeric_cols:
            date_col = date_cols[0]
            num_col = numeric_cols[0]
            
            # Simple aggregation for preview
            try:
                df_temp = df.copy()
                df_temp[date_col] = pd.to_datetime(df_temp[date_col])
                trend = df_temp.groupby(df_temp[date_col].dt.to_period("M"))[num_col].sum().reset_index()
                trend[date_col] = trend[date_col].astype(str)
                
                charts.append({
                    "id": "chart_1",
                    "title": f"Monthly {num_col} Trend",
                    "type": "line",
                    "data": trend.tail(12).to_dict(orient="records"),
                    "x_key": date_col,
                    "y_key": num_col
                })
            except:
                pass
                
        # 2. Categorical vs Numeric (Bar chart)
        if categorical_cols and numeric_cols:
            cat_col = categorical_cols[0]
            num_col = numeric_cols[0]
            
            try:
                bar_data = df.groupby(cat_col)[num_col].sum().reset_index().sort_values(by=num_col, ascending=False).head(10)
                charts.append({
                    "id": "chart_2",
                    "title": f"Top 10 {cat_col} by {num_col}",
                    "type": "bar",
                    "data": bar_data.to_dict(orient="records"),
                    "x_key": cat_col,
                    "y_key": num_col
                })
            except:
                pass
                
        return charts

    @staticmethod
    def profile_dataset(file_path: str) -> Dict[str, Any]:
        """Profiles a dataset using Pandas."""
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
                elif dtype_str == 'object' and not is_date:
                    col_info["type"] = "categorical"
                
                columns.append(col_info)

            total_missing = sum(c["missing_count"] for c in columns)
            total_cells = row_count * col_count
            missing_penalty = (total_missing / total_cells) * 100 if total_cells > 0 else 0
            data_quality_score = max(0.0, min(100.0, 100.0 - (missing_penalty * 2)))
            
            charts = DataProfiler._generate_default_charts(df, columns)

            return {
                "row_count": row_count,
                "col_count": col_count,
                "data_quality_score": round(data_quality_score, 1),
                "profile_data": {
                    "columns": columns,
                    "duplicate_rows": int(df.duplicated().sum()),
                    "default_charts": charts
                }
            }
        except Exception as e:
            logger.error(f"Failed to profile dataset: {str(e)}")
            raise
