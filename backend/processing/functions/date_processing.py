
import pandas as pd

# For data columns with UTC time, double confirm UTC timezone and store it as a datetime format
def confirm_utc(df, date_col, format=None):
    return pd.to_datetime(df[date_col], format=format, errors='coerce', utc=True)

# Convert UTC datetime to PST/PDT date
def add_new_utc_to_pst_pdt_column(df, utc_col):
    pst_pdt_series = df[utc_col].dt.tz_convert('US/Pacific')
    return pst_pdt_series.dt.date

# Add month-end date according to PST/PDT date
def add_month_end_column(date_series):
    date_series = pd.to_datetime(date_series, errors='coerce')
    return (date_series + pd.offsets.MonthEnd(0)).dt.date

# Date Conversion without Time Zone (assumed PST/PDT), when date is stored as m/d/y
def add_convert_to_date_column(df, date_col, format='%m/%d/%Y'):
    return pd.to_datetime(df[date_col], format=format).dt.date

# Date Conversion without Time Zone (assumed PST/PDT), when date is stored as mmm dd, yyyy, h:m a(p).m.
def remove_time_and_add_convert_to_date_column(df, date_col, format='%b %d, %Y, %I:%M %p', replace_dict=None):
    if replace_dict is None:
        replace_dict = {'a.m.': 'AM', 'p.m.': 'PM'}
    for old, new in replace_dict.items():
        df[date_col] = df[date_col].str.replace(old, new)
    return pd.to_datetime(df[date_col], format=format).dt.date