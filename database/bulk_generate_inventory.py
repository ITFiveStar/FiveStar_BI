import requests
from datetime import datetime, timedelta
import time
import logging

# === CONFIG ===
BASE_URL = 'http://localhost:5000'  
START_DATE_STR = '2025-03-01'
END_DATE_STR = '2025-03-31'
DELAY_SECONDS = 1

# === LOGGING SETUP ===
logging.basicConfig(
    filename='bulk_inventory_generation.log',
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(message)s'
)

# === MAIN LOOP ===
def generate_inventory_range():
    start_date = datetime.strptime(START_DATE_STR, '%Y-%m-%d')
    end_date = datetime.strptime(END_DATE_STR, '%Y-%m-%d')
    current_date = start_date

    while current_date <= end_date:
        date_str = current_date.strftime('%Y-%m-%d')
        logging.info(f"Processing date: {date_str}")
        print(f"Processing date: {date_str}")

        try:
            # 1. Finished Goods Inventory
            fg_response = requests.get(f"{BASE_URL}/inventory/generate", params={'date': date_str})
            if fg_response.status_code == 200:
                logging.info(f"[Finished Goods] Success.")
            else:
                logging.warning(f"[Finished Goods] Failed ({fg_response.status_code}): {fg_response.text}")

        except Exception as e:
            logging.error(f"[Finished Goods] Exception: {str(e)}")

        time.sleep(DELAY_SECONDS)  # brief pause

        try:
            # 2. Raw Material Inventory
            raw_response = requests.get(f"{BASE_URL}/inventory_raw_material/generate", params={'date': date_str})
            if raw_response.status_code == 200:
                logging.info(f"[Raw Material] Success.")
            else:
                logging.warning(f"[Raw Material] Failed ({raw_response.status_code}): {raw_response.text}")

        except Exception as e:
            logging.error(f"[Raw Material] Exception: {str(e)}")

        time.sleep(DELAY_SECONDS)  # brief pause
        current_date += timedelta(days=1)

    logging.info("✅ Completed inventory generation for all dates.")
    print("\n✅ All dates processed.")

# === ENTRY POINT ===
if __name__ == "__main__":
    generate_inventory_range()
