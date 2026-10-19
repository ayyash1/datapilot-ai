import os
import pandas as pd

def load_dataset_dataframe(file_path: str) -> pd.DataFrame:
    """
    Safely loads a CSV or Excel dataset into a pandas DataFrame.
    Handles case-insensitive extensions (.csv, .CSV, .xlsx, .XLSX)
    and falls back through common encodings (utf-8, utf-8-sig, latin1, cp1252, iso-8859-1).
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Dataset file not found: {file_path}")

    lower_path = file_path.lower()
    if lower_path.endswith('.csv'):
        encodings = ['utf-8', 'utf-8-sig', 'latin1', 'cp1252', 'iso-8859-1']
        last_error = None
        for enc in encodings:
            try:
                return pd.read_csv(file_path, encoding=enc)
            except (UnicodeDecodeError, UnicodeError) as e:
                last_error = e
                continue
            except Exception:
                raise
        # Fallback if standard encodings failed
        try:
            return pd.read_csv(file_path, encoding_errors='replace')
        except Exception:
            if last_error:
                raise last_error
            raise
    elif lower_path.endswith(('.xlsx', '.xls')):
        return pd.read_excel(file_path)
    else:
        raise ValueError(f"Unsupported file format: {file_path}")
