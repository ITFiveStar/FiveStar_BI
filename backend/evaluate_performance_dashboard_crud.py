from flask import Flask, jsonify, request
from flask_cors import CORS
from typing import Dict, List, Tuple, Any, Union, Optional
from sqlalchemy import and_, or_
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta, date
from calendar import monthrange
from dateutil.relativedelta import relativedelta
import pandas as pd
import numpy as np
from backend import app, db
from backend.models import COGS, AllOrdersPnL
from sqlalchemy import text
import traceback
# from scipy.optimize import root_scalar  # Temporarily commented out for AWS App Runner build
import json
import math
import plotly.graph_objects as go
import os
import sys
import shutil
import requests
import traceback


#-------------------------------------------------------------------------------------------------
# Overall Functions                                                                               |
#-------------------------------------------------------------------------------------------------
def get_revenue_cogs_operating_expenses_period_start_to_period_end(as_of_date: datetime, period_display: str):

    # Determine the start date based on period display
    if period_display == 'month':
        month_start = datetime(as_of_date.year, as_of_date.month, 1)
        month_end_list = [datetime(
        as_of_date.year,
        as_of_date.month,
        monthrange(as_of_date.year, as_of_date.month)[1]
        ).date()]
    elif period_display == 'quarter':
        quarter_month = (as_of_date.month - 1) // 3 * 3 + 1
        month_start = datetime(as_of_date.year, quarter_month, 1)
        month_end_list = [d.to_pydatetime().date() for d in pd.date_range(
            start=month_start,
            end=as_of_date,
            freq='M'
        )]
    elif period_display == 'year':
        month_start = datetime(as_of_date.year, 1, 1)
        month_end_list = [d.to_pydatetime().date() for d in pd.date_range(
            start=month_start,
            end=as_of_date,
            freq='M'
        )]
    
    month_end_param_keys = [f"month_end_{i}" for i in range(len(month_end_list))]
    month_end_param_placeholders = ', '.join(f":{key}" for key in month_end_param_keys)
    month_end_params = {key: val for key, val in zip(month_end_param_keys, month_end_list)}

    query = """
    with order_settlement_data as (
    select 
            purchase_date_pst_pdt,
            data_month_last_day,
            sales_status,
            payment_status,
            amazon_order_id,
            sku,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_item_price, 0)
                        + COALESCE(statements_shipping_price, 0)
                        + COALESCE(statements_gift_wrap_price, 0)
                        + COALESCE(statements_item_tax, 0)
                        + COALESCE(statements_shipping_tax, 0)
                        + COALESCE(statements_gift_wrap_tax, 0)
                        + COALESCE(statements_order_other, 0)
                        + COALESCE(returns_shipping_chargeback, 0)
                        + COALESCE(returns_gift_wrap_chargeback, 0)
                        + COALESCE(returns_item_promotion_discount, 0)	
                        + COALESCE(returns_ship_promotion_discount, 0)	
                        + COALESCE(returns_commission, 0)	
                        + COALESCE(returns_digital_services_fee, 0)	
                        + COALESCE(returns_fbm_shipping_commission, 0)	
                        + COALESCE(returns_marketplace_facilitator_tax_principal, 0)	
                        + COALESCE(returns_marketplace_facilitator_tax_shipping, 0)	
                        + COALESCE(statements_return_other, 0)	
                        + COALESCE(statements_other_allocated, 0)
                        + COALESCE(statements_non_sku_adjustments, 0)
                    else
                        COALESCE(item_price, 0)	
                        + COALESCE(shipping_price, 0)	
                        + COALESCE(gift_wrap_price, 0)	
                        + COALESCE(item_tax, 0)	
                        + COALESCE(shipping_tax, 0)	
                        + COALESCE(gift_wrap_tax, 0)
                end
            ) as total_revenue,
            sum(
                COALESCE(returns_shipping_chargeback, 0)
                + COALESCE(returns_gift_wrap_chargeback, 0)
                + COALESCE(returns_item_promotion_discount, 0)	
                + COALESCE(returns_ship_promotion_discount, 0)	
                + COALESCE(returns_commission, 0)	
                + COALESCE(returns_digital_services_fee, 0)	
                + COALESCE(returns_fbm_shipping_commission, 0)	
                + COALESCE(returns_marketplace_facilitator_tax_principal, 0)	
                + COALESCE(returns_marketplace_facilitator_tax_shipping, 0)	
                    + COALESCE(statements_return_other, 0)
            ) as revenue_returns,
            sum(
                COALESCE(statements_other, 0)
                + COALESCE(statements_non_sku_adjustments, 0)
            ) as revenue_other,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_shipping_chargeback, 0)
                        + COALESCE(statements_gift_wrap_chargeback, 0)
                        + COALESCE(statements_item_promotion_discount, 0)	
                        + COALESCE(statements_ship_promotion_discount, 0)	
                        + COALESCE(statements_promotion_deal_coupon_fees_allocated, 0)	
                        + COALESCE(statements_commission, 0)	
                        + COALESCE(statements_sponsored_products_charge_allocated, 0)	
                        + COALESCE(statements_sales_tax_service_fee, 0)	
                        + COALESCE(statements_digital_services_fee, 0)	
                        + COALESCE(statements_fba_fulfillment_fee, 0)
                        + COALESCE(fba_inbound_transportation_fee, 0)	
                        + COALESCE(statements_fba_storage_fee_allocated, 0)	
                        + COALESCE(statements_fbm_shipping_commission, 0)	
                        + COALESCE(statements_subscription_fee_allocated, 0)	
                        + COALESCE(statements_marketplace_facilitator_tax_principal, 0)	
                        + COALESCE(statements_marketplace_facilitator_tax_shipping, 0)	
                        + COALESCE(returns_shipping_price, 0)	
                        + COALESCE(returns_gift_wrap_price, 0)	
                        + COALESCE(returns_item_tax, 0)	
                        + COALESCE(returns_shipping_tax, 0)	
                        + COALESCE(returns_gift_wrap_tax, 0)		
                        + COALESCE(returns_refund_commission, 0)	
                    else
                        COALESCE(item_promotion_discount, 0)	
                        + COALESCE(ship_promotion_discount, 0)	
                        + COALESCE(commission, 0)	
                        + COALESCE(sponsored_products_charge, 0)	
                        + COALESCE(sales_tax_service_fee, 0)	
                        + COALESCE(marketplace_facilitator_tax_principal, 0)	
                        + COALESCE(marketplace_facilitator_tax_shipping, 0)
                        + COALESCE(digital_services_fee, 0)	
                        + COALESCE(fba_fulfillment_fee, 0)	
                        + COALESCE(fba_inbound_transportation_fee, 0)	
                        + COALESCE(fba_storage_fee, 0)	
                        + COALESCE(fbm_shipping_commission, 0)	
                        + COALESCE(subscription_fee, 0)	
                end
            ) as total_operating_expenses,
            sum( 
                COALESCE(returns_shipping_price, 0)	
                + COALESCE(returns_gift_wrap_price, 0)	
                + COALESCE(returns_item_tax, 0)	
                + COALESCE(returns_shipping_tax, 0)	
                + COALESCE(returns_gift_wrap_tax, 0)		
                + COALESCE(returns_refund_commission, 0)	
            ) as operating_expenses_returns
    from allorderspnl
        where (CAST(purchase_date_pst_pdt AS timestamp) <= CAST(:as_of_date AS timestamp) and CAST(purchase_date_pst_pdt AS timestamp) >= CAST(:month_start AS timestamp))
          or (purchase_date_pst_pdt is null and data_month_last_day IN ({month_end_param_placeholders}))
        group by purchase_date_pst_pdt, data_month_last_day, sales_status, payment_status, amazon_order_id, sku
    )
    select 
        o.purchase_date_pst_pdt,
        o.data_month_last_day,
        o.sales_status,
        o.payment_status,
        o.amazon_order_id,
        o.sku,
        sum(COALESCE(total_revenue, 0)) as total_revenue,
        sum(COALESCE(revenue_returns, 0)) as revenue_returns,
        sum(COALESCE(revenue_other, 0)) as revenue_other,
        sum(COALESCE(cogs, 0)) as cogs,
        sum(COALESCE(total_operating_expenses, 0)) as total_operating_expenses,
        sum(COALESCE(operating_expenses_returns, 0)) as operating_expenses_returns,
        sum(COALESCE(shipping_cost, 0)) as shipping_cost
    from order_settlement_data as o
    left join (select sales_record_id, sku, sum(COALESCE(cogs, 0)) as cogs from cogs group by sales_record_id, sku) as cogs_table
    on o.amazon_order_id = cogs_table.sales_record_id and lower(o.sku) = lower(cogs_table.sku)
    left join (select order_id, sum(COALESCE(shipping_cost, 0)) as shipping_cost from fbmshippingcost group by order_id) as FBMShippingCost
    on o.amazon_order_id = FBMShippingCost.order_id
    group by o.purchase_date_pst_pdt, o.data_month_last_day, o.sales_status, o.payment_status, o.amazon_order_id, o.sku 
    """
    
    query_params = {
        "as_of_date": as_of_date,
        "month_start": month_start,
        **month_end_params
    }
    result = db.session.execute(
        text(query.format(month_end_param_placeholders=month_end_param_placeholders)),
        query_params
    ).mappings().all()
    
    if not result:
        return pd.DataFrame(columns=[
            'purchase_date_pst_pdt', 'data_month_last_day', 'sales_status', 'payment_status', 'sku',
            'total_revenue', 'revenue_returns', 'revenue_other',
            'COGS', 'total_operating_expenses', 'operating_expenses_returns'
        ])
    else:
        result = pd.DataFrame(result)
        result = result.rename(columns={'cogs': 'COGS'})
        order_id_sku_count = result.groupby('amazon_order_id')['sku'].count()
        result['order_id_sku_count'] = result['amazon_order_id'].map(order_id_sku_count)
        result['shipping_cost'] = np.where(
            result['order_id_sku_count'] > 0,
            result['shipping_cost'] / result['order_id_sku_count'],
            0
        )
        result['total_operating_expenses'] = result['total_operating_expenses'] + result['shipping_cost']
        result = result.drop(columns=['order_id_sku_count', 'shipping_cost','amazon_order_id'])

        result['purchase_date_pst_pdt'] = result['purchase_date_pst_pdt'].fillna(pd.to_datetime('2099-12-31').date())
        result['sku'] = result['sku'].fillna('NonSKU_NonSKU_NonSKU')
        result = result.groupby(['purchase_date_pst_pdt', 'data_month_last_day', 'sales_status', 'payment_status', 'sku']).sum().reset_index()
        result['purchase_date_pst_pdt'] = result['purchase_date_pst_pdt'].replace(pd.to_datetime('2099-12-31').date(), pd.NaT)
        result['sku'] = result['sku'].replace('NonSKU_NonSKU_NonSKU', np.nan)

        return result

def get_revenue_cogs_operating_expenses_by_period_since_beginning(as_of_date: datetime, period_display: str):
    # Determine end date for no sales time
    month_end = datetime(as_of_date.year, as_of_date.month, monthrange(as_of_date.year, as_of_date.month)[1]).date()

    query = """
    with order_settlement_data as (
        select 
            data_month_last_day,
            amazon_order_id,
            sku,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_item_price, 0)
                        + COALESCE(statements_shipping_price, 0)
                        + COALESCE(statements_gift_wrap_price, 0)
                        + COALESCE(statements_item_tax, 0)
                        + COALESCE(statements_shipping_tax, 0)
                        + COALESCE(statements_gift_wrap_tax, 0)
                        + COALESCE(statements_order_other, 0)
                        + COALESCE(returns_shipping_chargeback, 0)
                        + COALESCE(returns_gift_wrap_chargeback, 0)
                        + COALESCE(returns_item_promotion_discount, 0)	
                        + COALESCE(returns_ship_promotion_discount, 0)	
                        + COALESCE(returns_commission, 0)	
                        + COALESCE(returns_digital_services_fee, 0)	
                        + COALESCE(returns_fbm_shipping_commission, 0)	
                        + COALESCE(returns_marketplace_facilitator_tax_principal, 0)	
                        + COALESCE(returns_marketplace_facilitator_tax_shipping, 0)	
                        + COALESCE(statements_return_other, 0)	
                        + COALESCE(statements_other_allocated, 0)
                        + COALESCE(statements_non_sku_adjustments, 0)
                    else
                        COALESCE(item_price, 0)	
                        + COALESCE(shipping_price, 0)	
                        + COALESCE(gift_wrap_price, 0)	
                        + COALESCE(item_tax, 0)	
                        + COALESCE(shipping_tax, 0)	
                        + COALESCE(gift_wrap_tax, 0)
                end
            ) as total_revenue,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_shipping_chargeback, 0)
                        + COALESCE(statements_gift_wrap_chargeback, 0)
                        + COALESCE(statements_item_promotion_discount, 0)	
                        + COALESCE(statements_ship_promotion_discount, 0)	
                        + COALESCE(statements_promotion_deal_coupon_fees_allocated, 0)	
                        + COALESCE(statements_commission, 0)	
                        + COALESCE(statements_sponsored_products_charge_allocated, 0)	
                        + COALESCE(statements_sales_tax_service_fee, 0)	
                        + COALESCE(statements_digital_services_fee, 0)	
                        + COALESCE(statements_fba_fulfillment_fee, 0)
                        + COALESCE(fba_inbound_transportation_fee, 0)	
                        + COALESCE(statements_fba_storage_fee_allocated, 0)	
                        + COALESCE(statements_fbm_shipping_commission, 0)	
                        + COALESCE(statements_subscription_fee_allocated, 0)	
                        + COALESCE(statements_marketplace_facilitator_tax_principal, 0)	
                        + COALESCE(statements_marketplace_facilitator_tax_shipping, 0)	
                        + COALESCE(returns_shipping_price, 0)	
                        + COALESCE(returns_gift_wrap_price, 0)	
                        + COALESCE(returns_item_tax, 0)	
                        + COALESCE(returns_shipping_tax, 0)	
                        + COALESCE(returns_gift_wrap_tax, 0)		
                        + COALESCE(returns_refund_commission, 0)	
                    else
                        COALESCE(item_promotion_discount, 0)	
                        + COALESCE(ship_promotion_discount, 0)	
                        + COALESCE(commission, 0)	
                        + COALESCE(sponsored_products_charge, 0)	
                        + COALESCE(sales_tax_service_fee, 0)	
                        + COALESCE(marketplace_facilitator_tax_principal, 0)	
                        + COALESCE(marketplace_facilitator_tax_shipping, 0)
                        + COALESCE(digital_services_fee, 0)	
                        + COALESCE(fba_fulfillment_fee, 0)	
                        + COALESCE(fba_inbound_transportation_fee, 0)	
                        + COALESCE(fba_storage_fee, 0)	
                        + COALESCE(fbm_shipping_commission, 0)	
                        + COALESCE(subscription_fee, 0)	
                end
            ) as total_operating_expenses
        from allorderspnl
        where (CAST(purchase_date_pst_pdt AS timestamp) <= CAST(:as_of_date AS timestamp))
          or (purchase_date_pst_pdt is null and data_month_last_day <= :month_end)
        group by data_month_last_day, amazon_order_id, sku
    )
    select 
        o.data_month_last_day,
        o.amazon_order_id,
        o.sku,
        sum(COALESCE(total_revenue, 0)) as total_revenue,
        sum(COALESCE(cogs, 0)) as cogs,
        sum(COALESCE(total_operating_expenses, 0)) as total_operating_expenses,
        sum(COALESCE(shipping_cost, 0)) as shipping_cost
    from order_settlement_data as o
    left join (select sales_record_id, sku, sum(COALESCE(cogs, 0)) as cogs from cogs group by sales_record_id, sku) as cogs_table
    on o.amazon_order_id = cogs_table.sales_record_id and lower(o.sku) = lower(cogs_table.sku)
    left join (select order_id, sum(COALESCE(shipping_cost, 0)) as shipping_cost from fbmshippingcost group by order_id) as FBMShippingCost
    on o.amazon_order_id = FBMShippingCost.order_id
    group by o.data_month_last_day, o.amazon_order_id, o.sku 
    """
    
    result = db.session.execute(
        text(query),
        {"as_of_date": as_of_date, "month_end": month_end}
    ).mappings().all()
    
    if not result:
        return pd.DataFrame(columns=[
            'data_month_last_day', 'sku',
            'total_revenue', 'COGS',
            'total_operating_expenses'
        ])
    else:
        result = pd.DataFrame(result)
        result = result.rename(columns={'cogs': 'COGS'})
        order_id_sku_count = result.groupby('amazon_order_id')['sku'].count()
        result['order_id_sku_count'] = result['amazon_order_id'].map(order_id_sku_count)
        result['shipping_cost'] = np.where(
            result['order_id_sku_count'] > 0,
            result['shipping_cost'] / result['order_id_sku_count'],
            0
        )
        result['total_operating_expenses'] = result['total_operating_expenses'] + result['shipping_cost']
        result = result.drop(columns=['order_id_sku_count', 'shipping_cost','amazon_order_id'])

        result['sku'] = result['sku'].fillna('NonSKU_NonSKU_NonSKU')
        result = result.groupby(['data_month_last_day', 'sku']).sum().reset_index()
        result['sku'] = result['sku'].replace('NonSKU_NonSKU_NonSKU', np.nan)
        return result

def get_main_component_sales(as_of_date: datetime, period_display: str):

    # Determine the start date based on period display
    if period_display == 'month':
        month_start = datetime(as_of_date.year, as_of_date.month, 1)
    elif period_display == 'quarter':
        quarter_month = (as_of_date.month - 1) // 3 * 3 + 1
        month_start = datetime(as_of_date.year, quarter_month, 1)
    elif period_display == 'year':
        month_start = datetime(as_of_date.year, 1, 1)

    query = """
    select 
        data_month_last_day,
        sku,
        sum(
            case when payment_status = 'Paid'
                 then 
                    COALESCE(statements_item_price, 0)
                    + COALESCE(statements_shipping_price, 0)
                    + COALESCE(statements_gift_wrap_price, 0)
                    + COALESCE(statements_item_tax, 0)
                    + COALESCE(statements_shipping_tax, 0)
                    + COALESCE(statements_gift_wrap_tax, 0)
                    + COALESCE(statements_order_other, 0)
                 else
                    COALESCE(item_price, 0)	
                    + COALESCE(shipping_price, 0)	
                    + COALESCE(gift_wrap_price, 0)	
                    + COALESCE(item_tax, 0)	
                    + COALESCE(shipping_tax, 0)	
                    + COALESCE(gift_wrap_tax, 0)
            end
        ) as revenue,
        sum(quantity) as quantity
    from allorderspnl as allorders
    where (CAST(purchase_date_pst_pdt AS timestamp) <= CAST(:as_of_date AS timestamp) and CAST(purchase_date_pst_pdt AS timestamp) >= CAST(:month_start AS timestamp))
    group by data_month_last_day, sku
    """
    
    result = db.session.execute(text(query),{"as_of_date": as_of_date, "month_start": month_start}).mappings().all()
    
    if not result:
        return jsonify({'error': 'No Amazon orders found'}), 404
    
    result_df = pd.DataFrame(result)
    result_df['main_component'] = result_df['sku'].apply(lambda s: s.split('_', 1)[-1].split('_', 1)[0])

    return result_df

def get_main_component_gross_margin_net_profit(as_of_date: datetime, period_display: str):

    # Determine the start date based on period display
    if period_display == 'month':
        month_start = datetime(as_of_date.year, as_of_date.month, 1)
        month_end_list = [datetime(
        as_of_date.year,
        as_of_date.month,
        monthrange(as_of_date.year, as_of_date.month)[1]
        ).date()]
    elif period_display == 'quarter':
        quarter_month = (as_of_date.month - 1) // 3 * 3 + 1
        month_start = datetime(as_of_date.year, quarter_month, 1)
        month_end_list = [d.to_pydatetime().date() for d in pd.date_range(
            start=month_start,
            end=as_of_date,
            freq='M'
        )]
    elif period_display == 'year':
        month_start = datetime(as_of_date.year, 1, 1)
        month_end_list = [d.to_pydatetime().date() for d in pd.date_range(
            start=month_start,
            end=as_of_date,
            freq='M'
        )]
    
    month_end_param_keys = [f"month_end_{i}" for i in range(len(month_end_list))]
    month_end_param_placeholders = ', '.join(f":{key}" for key in month_end_param_keys)
    month_end_params = {key: val for key, val in zip(month_end_param_keys, month_end_list)}

    query = """
    with order_settlement_data as (
    select 
            amazon_order_id,
            sku,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_item_price, 0)
                        + COALESCE(statements_shipping_price, 0)
                        + COALESCE(statements_gift_wrap_price, 0)
                        + COALESCE(statements_item_tax, 0)
                        + COALESCE(statements_shipping_tax, 0)
                        + COALESCE(statements_gift_wrap_tax, 0)
                        + COALESCE(statements_order_other, 0)	
                    else
                        COALESCE(item_price, 0)	
                        + COALESCE(shipping_price, 0)	
                        + COALESCE(gift_wrap_price, 0)	
                        + COALESCE(item_tax, 0)	
                        + COALESCE(shipping_tax, 0)	
                        + COALESCE(gift_wrap_tax, 0)
                end
            ) as revenue,
        sum(
            case when payment_status = 'Paid'
                then 
                    COALESCE(statements_shipping_chargeback, 0)
                    + COALESCE(statements_gift_wrap_chargeback, 0)
                    + COALESCE(statements_item_promotion_discount, 0)	
                    + COALESCE(statements_ship_promotion_discount, 0)	
                        + COALESCE(statements_promotion_deal_coupon_fees_allocated, 0)	
                    + COALESCE(statements_commission, 0)	
                        + COALESCE(statements_sponsored_products_charge_allocated, 0)	
                    + COALESCE(statements_sales_tax_service_fee, 0)	
                    + COALESCE(statements_digital_services_fee, 0)	
                    + COALESCE(statements_fba_fulfillment_fee, 0)	
                        + COALESCE(fba_inbound_transportation_fee, 0)
                        + COALESCE(statements_FBA_storage_fee_allocated, 0)	
                    + COALESCE(statements_fbm_shipping_commission, 0)	
                        + COALESCE(statements_subscription_fee_allocated, 0)	
                    + COALESCE(statements_marketplace_facilitator_tax_principal, 0)	
                    + COALESCE(statements_marketplace_facilitator_tax_shipping, 0)	
                else
                    COALESCE(item_promotion_discount, 0)	
                    + COALESCE(ship_promotion_discount, 0)	
                    + COALESCE(commission, 0)	
                    + COALESCE(sponsored_products_charge, 0)	
                    + COALESCE(sales_tax_service_fee, 0)	
                    + COALESCE(marketplace_facilitator_tax_principal, 0)	
                    + COALESCE(marketplace_facilitator_tax_shipping, 0)
                    + COALESCE(digital_services_fee, 0)	
                    + COALESCE(fba_fulfillment_fee, 0)	
                    + COALESCE(fba_inbound_transportation_fee, 0)	
                    + COALESCE(fba_storage_fee, 0)	
                    + COALESCE(fbm_shipping_commission, 0)	
                    + COALESCE(subscription_fee, 0)	
            end
            ) as operating_expenses
    from allorderspnl
        where ((CAST(purchase_date_pst_pdt AS timestamp) <= CAST(:as_of_date AS timestamp) and CAST(purchase_date_pst_pdt AS timestamp) >= CAST(:month_start AS timestamp))
          or (purchase_date_pst_pdt is null and data_month_last_day IN ({month_end_param_placeholders})))
          and sku is not null
        group by amazon_order_id, sku
    )
    select 
        o.amazon_order_id,
        o.sku,
        sum(COALESCE(revenue, 0)) as revenue,
        sum(COALESCE(cogs, 0)) as cogs,
        sum(COALESCE(operating_expenses, 0)) as operating_expenses,
        sum(COALESCE(shipping_cost, 0)) as shipping_cost
    from order_settlement_data as o
    left join (select sales_record_id, sku, sum(COALESCE(cogs, 0)) as cogs from cogs group by sales_record_id, sku) as cogs_table
    on o.amazon_order_id = cogs_table.sales_record_id and lower(o.sku) = lower(cogs_table.sku)
    left join (select order_id, sum(COALESCE(shipping_cost, 0)) as shipping_cost from fbmshippingcost group by order_id) as FBMShippingCost
    on o.amazon_order_id = FBMShippingCost.order_id
    group by o.amazon_order_id, o.sku
    """
    
    query_params = {
        "as_of_date": as_of_date,
        "month_start": month_start,
        **month_end_params
    }
    result = db.session.execute(
        text(query.format(month_end_param_placeholders=month_end_param_placeholders)),
        query_params
    ).mappings().all()
    
    if not result:
        return jsonify({'error': 'No Amazon orders found'}), 404
    
    result_df = pd.DataFrame(result)
    result_df = result_df.rename(columns={'cogs': 'COGS'})
    order_id_sku_count = result_df.groupby('amazon_order_id')['sku'].count()
    result_df['order_id_sku_count'] = result_df['amazon_order_id'].map(order_id_sku_count)
    result_df['shipping_cost'] = np.where(
        result_df['order_id_sku_count'] > 0,
        result_df['shipping_cost'] / result_df['order_id_sku_count'],
        0
    )
    result_df['operating_expenses'] = result_df['operating_expenses'] + result_df['shipping_cost']
    result_df = result_df.drop(columns=['order_id_sku_count', 'shipping_cost','amazon_order_id'])

    result_df['sku'] = result_df['sku'].fillna('NonSKU_NonSKU_NonSKU')
    result_df = result_df.groupby('sku').sum().reset_index()
    result_df['sku'] = result_df['sku'].replace('NonSKU_NonSKU_NonSKU', np.nan)

    result_df['revenue']=result_df['revenue'].fillna(0)
    result_df['COGS']=result_df['COGS'].fillna(0)
    result_df['operating_expenses']=result_df['operating_expenses'].fillna(0)
    result_df['main_component'] = result_df['sku'].apply(lambda s: s.split('_', 1)[-1].split('_', 1)[0])
    result_df['gross_margin'] = result_df['revenue'] - result_df['COGS']
    result_df['operating_expenses'] = result_df['operating_expenses'] * -1
    result_df['net_profit'] = result_df['revenue'] - result_df['COGS'] - result_df['operating_expenses']

    return result_df

def get_AR_AP_by_date():
    query = """
    select 
        purchase_date_pst_pdt,
        non_order_deposit_date_pst_pdt as data_month_last_day,
        amazon_order_id,
        sku,
        sum(
            case when payment_status = 'Paid'
                 then 
                    COALESCE(statements_item_price, 0)
                    + COALESCE(statements_shipping_price, 0)
                    + COALESCE(statements_gift_wrap_price, 0)
                    + COALESCE(statements_item_tax, 0)
                    + COALESCE(statements_shipping_tax, 0)
                    + COALESCE(statements_gift_wrap_tax, 0)
                    + COALESCE(statements_order_other, 0)
                    + COALESCE(returns_shipping_chargeback, 0)
                    + COALESCE(returns_gift_wrap_chargeback, 0)
                    + COALESCE(returns_item_promotion_discount, 0)	
                    + COALESCE(returns_ship_promotion_discount, 0)	
                    + COALESCE(returns_commission, 0)	
                    + COALESCE(returns_digital_services_fee, 0)	
                    + COALESCE(returns_fbm_shipping_commission, 0)	
                    + COALESCE(returns_marketplace_facilitator_tax_principal, 0)	
                    + COALESCE(returns_marketplace_facilitator_tax_shipping, 0)	
                    + COALESCE(statements_return_other, 0)	
                    + COALESCE(statements_other_allocated, 0)
                    + COALESCE(statements_non_sku_adjustments, 0)
                 else
                    COALESCE(item_price, 0)	
                    + COALESCE(shipping_price, 0)	
                    + COALESCE(gift_wrap_price, 0)	
                    + COALESCE(item_tax, 0)	
                    + COALESCE(shipping_tax, 0)	
                    + COALESCE(gift_wrap_tax, 0)
            end
        ) as ar,
        sum(
            case when payment_status = 'Paid'
                then 
                    COALESCE(statements_shipping_chargeback, 0)
                    + COALESCE(statements_gift_wrap_chargeback, 0)
                    + COALESCE(statements_item_promotion_discount, 0)	
                    + COALESCE(statements_ship_promotion_discount, 0)	
                    + COALESCE(statements_promotion_deal_coupon_fees_allocated, 0)	
                    + COALESCE(statements_commission, 0)	
                    + COALESCE(statements_sponsored_products_charge_allocated, 0)	
                    + COALESCE(statements_sales_tax_service_fee, 0)	
                    + COALESCE(statements_digital_services_fee, 0)	
                    + COALESCE(statements_FBA_fulfillment_fee, 0)	
                    + COALESCE(FBA_inbound_transportation_fee, 0)
                    + COALESCE(statements_FBA_storage_fee_allocated, 0)	
                    + COALESCE(statements_fbm_shipping_commission, 0)	
                    + COALESCE(statements_subscription_fee_allocated, 0)	
                    + COALESCE(statements_marketplace_facilitator_tax_principal, 0)	
                    + COALESCE(statements_marketplace_facilitator_tax_shipping, 0)	
                    + COALESCE(returns_item_price, 0)	
                    + COALESCE(returns_item_price_goodwill_adjustment, 0)
                    + COALESCE(returns_shipping_price, 0)	
                    + COALESCE(returns_gift_wrap_price, 0)	
                    + COALESCE(returns_item_tax, 0)	
                    + COALESCE(returns_shipping_tax, 0)	
                    + COALESCE(returns_gift_wrap_tax, 0)		
                    + COALESCE(returns_refund_commission, 0)	
                else
                    COALESCE(item_promotion_discount, 0)	
                    + COALESCE(ship_promotion_discount, 0)	
                    + COALESCE(commission, 0)	
                    + COALESCE(sponsored_products_charge, 0)	
                    + COALESCE(sales_tax_service_fee, 0)	
                    + COALESCE(marketplace_facilitator_tax_principal, 0)	
                    + COALESCE(marketplace_facilitator_tax_shipping, 0)
                    + COALESCE(digital_services_fee, 0)	
                    + COALESCE(fba_fulfillment_fee, 0)	
                    + COALESCE(fba_inbound_transportation_fee, 0)	
                    + COALESCE(fba_storage_fee, 0)	
                    + COALESCE(fbm_shipping_commission, 0)	
                    + COALESCE(subscription_fee, 0)	
            end
        ) as ap,
        sum(COALESCE(shipping_cost, 0)) as shipping_cost
    from allorderspnl 
    left join (select order_id, sum(COALESCE(shipping_cost, 0)) as shipping_cost from fbmshippingcost group by order_id) as FBMShippingCost
    on allorderspnl.amazon_order_id = FBMShippingCost.order_id
    group by purchase_date_pst_pdt, data_month_last_day, amazon_order_id, sku
    """
    
    result = db.session.execute(text(query)).mappings().all()
    
    if not result:
        return jsonify({'error': 'No Amazon orders found'}), 404
    
    result_df = pd.DataFrame(result)
    result_df = result_df.rename(columns={'ap': 'AP', 'ar': 'AR'})
    result_df['purchase_date_pst_pdt'] = pd.to_datetime(result_df['purchase_date_pst_pdt']).dt.date
    result_df['data_month_last_day'] = pd.to_datetime(result_df['data_month_last_day']).dt.date
    result_df['date'] = result_df['purchase_date_pst_pdt'].fillna(result_df['data_month_last_day'])
    result_df = result_df.drop(columns=['purchase_date_pst_pdt', 'data_month_last_day'])
    result_df['sku'] = result_df['sku'].fillna('NonSKU_NonSKU_NonSKU')

    order_id_sku_count = result_df.groupby('amazon_order_id')['sku'].count()
    result_df['order_id_sku_count'] = result_df['amazon_order_id'].map(order_id_sku_count)
    result_df['shipping_cost'] = np.where(
        result_df['order_id_sku_count'] > 0,
        result_df['shipping_cost'] / result_df['order_id_sku_count'],
        0
    )
    result_df['AP'] = result_df['AP'] + result_df['shipping_cost']
    result_df = result_df.drop(columns=['order_id_sku_count', 'shipping_cost','amazon_order_id'])
    result_df = result_df.groupby(['date', 'sku']).sum().reset_index()

    # Generate full date range dataset for each SKU
    min_date = result_df['date'].min()
    max_date = result_df['date'].max()
    full_date_range = pd.date_range(start=min_date, end=max_date)

    all_skus = result_df['sku'].unique()
    filled_list = []
    for sku in all_skus:
        sku_df = result_df[result_df['sku'] == sku].set_index('date')
        sku_df = sku_df.reindex(full_date_range, fill_value=0)
        sku_df['sku'] = sku
        sku_df = sku_df.reset_index().rename(columns={'index': 'date'})
        filled_list.append(sku_df)

    result_df = pd.concat(filled_list).sort_values(by=['sku', 'date']).reset_index(drop=True)
    result_df['date'] = result_df['date'].dt.date

    return result_df

def get_statements_deposit_closing_AR_AP_by_date():
    query = """
    with order_statements as (
        select 
            order_deposit_date_pst_pdt as deposit_date_pst_pdt,
            sku,
            sum(
                COALESCE(statements_item_price, 0)
                + COALESCE(statements_shipping_price, 0)
                + COALESCE(statements_gift_wrap_price, 0)
                + COALESCE(statements_item_tax, 0)
                + COALESCE(statements_shipping_tax, 0)
                + COALESCE(statements_gift_wrap_tax, 0)
                + COALESCE(statements_order_other, 0)
            ) as ar_closing,
            sum(
                COALESCE(statements_shipping_chargeback, 0)
                + COALESCE(statements_gift_wrap_chargeback, 0)
                + COALESCE(statements_item_promotion_discount, 0)	
                + COALESCE(statements_ship_promotion_discount, 0)	
                + COALESCE(statements_commission, 0)	
                + COALESCE(statements_sales_tax_service_fee, 0)	
                + COALESCE(statements_digital_services_fee, 0)	
                + COALESCE(statements_fba_fulfillment_fee, 0)	
                + COALESCE(fba_inbound_transportation_fee, 0)
                + COALESCE(statements_FBM_shipping_commission, 0)	
                + COALESCE(statements_marketplace_facilitator_tax_principal, 0)	
                + COALESCE(statements_marketplace_facilitator_tax_shipping, 0)	
            ) as ap_closing
        from allorderspnl 
        group by order_deposit_date_pst_pdt, sku
    ),
    other_statements as(
        select 
            non_order_deposit_date_pst_pdt as deposit_date_pst_pdt,
            sku,
            sum(
                COALESCE(statements_other, 0)
                + COALESCE(statements_non_sku_adjustments, 0)
            ) as ar_closing,
            sum(
	            COALESCE(statements_promotion_deal_coupon_fees_allocated, 0)		
                + COALESCE(statements_sponsored_products_charge_allocated, 0)	
                + COALESCE(statements_FBA_storage_fee_allocated, 0)	
                + COALESCE(statements_subscription_fee_allocated, 0)	
            ) as ap_closing
        from allorderspnl
        group by non_order_deposit_date_pst_pdt, sku
    ),
    return_statements as (
        select 
            return_deposit_date_pst_pdt as deposit_date_pst_pdt,
            sku,
            sum( 
                COALESCE(returns_shipping_chargeback, 0)
                + COALESCE(returns_gift_wrap_chargeback, 0)
                + COALESCE(returns_item_promotion_discount, 0)	
                + COALESCE(returns_ship_promotion_discount, 0)	
                + COALESCE(returns_commission, 0)	
                + COALESCE(returns_digital_services_fee, 0)	
                + COALESCE(returns_fbm_shipping_commission, 0)	
                + COALESCE(returns_marketplace_facilitator_tax_principal, 0)	
                + COALESCE(returns_marketplace_facilitator_tax_shipping, 0)	
                + COALESCE(statements_return_other, 0)	
            ) as ar_closing,
            sum(
                COALESCE(returns_item_price, 0)	
                + COALESCE(returns_item_price_goodwill_adjustment, 0)
                + COALESCE(returns_shipping_price, 0)	
                + COALESCE(returns_gift_wrap_price, 0)	
                + COALESCE(returns_item_tax, 0)	
                + COALESCE(returns_shipping_tax, 0)	
                + COALESCE(returns_gift_wrap_tax, 0)		
                + COALESCE(returns_refund_commission, 0)	
            ) as ap_closing
        from allorderspnl
        group by return_deposit_date_pst_pdt, sku
    ),
    combined_statements as (
        select * from order_statements
        union all
        select * from other_statements
        union all
        select * from return_statements
    )
    select deposit_date_pst_pdt, sku, sum(ar_closing) as ar_closing, sum(ap_closing) as ap_closing
    from combined_statements
    group by deposit_date_pst_pdt, sku
    """
    
    result = db.session.execute(text(query)).mappings().all()
    
    if not result:
        return jsonify({'error': 'No Amazon orders found'}), 404
    
    query2 = """
    select 
        purchase_date_pst_pdt,
        amazon_order_id,
        sku,
        sum(0) as ar_closing,
        sum(COALESCE(shipping_cost, 0)) as ap_closing
    from (select * from allorderspnl where amazon_order_id is not null) as AllOrdersPnL
    inner join (select order_id, sum(COALESCE(shipping_cost, 0)) as shipping_cost from fbmshippingcost group by order_id) as FBMShippingCost
    on allorderspnl.amazon_order_id = FBMShippingCost.order_id
    group by purchase_date_pst_pdt, amazon_order_id, sku
    """
    result2 = db.session.execute(text(query2)).mappings().all()
    result2_df = pd.DataFrame(result2)
    result2_df = result2_df.rename(columns={'ap_closing': 'AP_closing', 'ar_closing': 'AR_closing'})
    result2_df['purchase_date_pst_pdt'] = pd.to_datetime(result2_df['purchase_date_pst_pdt']).dt.date
    result2_df['deposit_date_pst_pdt'] = pd.to_datetime(result2_df['purchase_date_pst_pdt']) + pd.offsets.MonthEnd(0)
    result2_df['deposit_date_pst_pdt'] = result2_df['deposit_date_pst_pdt'].dt.date
    order_id_sku_count = result2_df.groupby('amazon_order_id')['sku'].count()
    result2_df['order_id_sku_count'] = result2_df['amazon_order_id'].map(order_id_sku_count)
    result2_df['AP_closing'] = np.where(
        result2_df['order_id_sku_count'] > 0,
        result2_df['AP_closing'] / result2_df['order_id_sku_count'],
        0
    )
    result2_df = result2_df.drop(columns=['order_id_sku_count', 'purchase_date_pst_pdt', 'amazon_order_id'])
    result2_df = result2_df.groupby(['deposit_date_pst_pdt','sku']).sum().reset_index()
    
    result_df = pd.DataFrame(result)
    result_df = result_df.rename(columns={'ar_closing': 'AR_closing', 'ap_closing': 'AP_closing'})
    result_df['deposit_date_pst_pdt'] = pd.to_datetime(result_df['deposit_date_pst_pdt']).dt.date
    result_df = pd.concat([result_df, result2_df])

    result_df['sku'] = result_df['sku'].fillna('NonSKU_NonSKU_NonSKU')
    result_df = result_df.groupby(['deposit_date_pst_pdt','sku']).sum().reset_index()

    return result_df

def get_cogs_details_by_component_type(as_of_date: datetime, period_display: str):

    # Determine the start date based on period display
    if period_display == 'month':
        month_start = datetime(as_of_date.year, as_of_date.month, 1)
        month_end_list = [datetime(
            as_of_date.year,
            as_of_date.month,
            monthrange(as_of_date.year, as_of_date.month)[1]
        ).date()]
    elif period_display == 'quarter':
        quarter_month = (as_of_date.month - 1) // 3 * 3 + 1
        month_start = datetime(as_of_date.year, quarter_month, 1)
        month_end_list = [d.to_pydatetime().date() for d in pd.date_range(
            start=month_start,
            end=as_of_date,
            freq='M'
        )]

    month_end_param_keys = [f"month_end_{i}" for i in range(len(month_end_list))]
    month_end_param_placeholders = ', '.join(f":{key}" for key in month_end_param_keys)
    month_end_params = {key: val for key, val in zip(month_end_param_keys, month_end_list)}

    query = """
        with latest_orders as (
            select 
                amazon_order_id, 
                sku, 
                purchase_date_pst_pdt,
                data_month_last_day,
                sum(
                    case when payment_status = 'Paid'
                        then 
                            COALESCE(statements_item_price, 0)
                            + COALESCE(statements_shipping_price, 0)
                            + COALESCE(statements_gift_wrap_price, 0)
                            + COALESCE(statements_item_tax, 0)
                            + COALESCE(statements_shipping_tax, 0)
                            + COALESCE(statements_gift_wrap_tax, 0)
                            + COALESCE(statements_order_other, 0)
                            + COALESCE(returns_shipping_chargeback, 0)
                            + COALESCE(returns_gift_wrap_chargeback, 0)
                            + COALESCE(returns_item_promotion_discount, 0)	
                            + COALESCE(returns_ship_promotion_discount, 0)	
                            + COALESCE(returns_commission, 0)	
                            + COALESCE(returns_digital_services_fee, 0)	
                            + COALESCE(returns_fbm_shipping_commission, 0)	
                            + COALESCE(returns_marketplace_facilitator_tax_principal, 0)	
                            + COALESCE(returns_marketplace_facilitator_tax_shipping, 0)	
                            + COALESCE(statements_return_other, 0)	
                            + COALESCE(statements_other, 0)
                            + COALESCE(statements_non_sku_adjustments, 0)
                        else
                            COALESCE(item_price, 0)	
                            + COALESCE(shipping_price, 0)	
                            + COALESCE(gift_wrap_price, 0)	
                            + COALESCE(item_tax, 0)	
                            + COALESCE(shipping_tax, 0)	
                            + COALESCE(gift_wrap_tax, 0)
                    end
                ) as total_revenue
            from allorderspnl
            where (CAST(purchase_date_pst_pdt AS timestamp) <= CAST(:as_of_date AS timestamp) and CAST(purchase_date_pst_pdt AS timestamp) >= CAST(:month_start AS timestamp))
                  or (purchase_date_pst_pdt is null and data_month_last_day IN ({month_end_param_placeholders}))
            group by amazon_order_id, sku, purchase_date_pst_pdt
        )
        
        select 
            o.purchase_date_pst_pdt,
            o.data_month_last_day,
            o.amazon_order_id,
            o.sku,
            case when cogs_table.result_id = 0 or cogs_table.result_id = 1 then 'COGS_use_returns_initiations' else 'COGS_use_PO_products' end as cogs_usage_type,
            cogs_table.fulfilled_by_PO,
            cogs_table.product,
            sum(COALESCE(cogs_table.cogs, 0)) as cogs,
            sum(COALESCE(total_revenue, 0)) as total_revenue
        from latest_orders as o
        left join (select sales_record_id, sku, result_id, product, fulfilled_by_PO, cogs from cogs) as cogs_table
        on o.amazon_order_id = cogs_table.sales_record_id and lower(o.sku) = lower(cogs_table.sku)
        group by o.purchase_date_pst_pdt, o.data_month_last_day, o.amazon_order_id, o.sku, 
                case when cogs_table.result_id = 0 or cogs_table.result_id = 1 then 'COGS_use_returns_initiations' else 'COGS_use_PO_products' end,
                cogs_table.fulfilled_by_PO, cogs_table.product
    """
    query_params = {
        "as_of_date": as_of_date,
        "month_start": month_start,
        **month_end_params
    }
    result = db.session.execute(
        text(query.format(month_end_param_placeholders=month_end_param_placeholders)),
        query_params
    ).mappings().all()
    
    if not result:
        return jsonify({'error': 'No COGS data found'}), 404
    
    result_df = pd.DataFrame(result)
    result_df = result_df.rename(columns={'cogs': 'COGS','cogs_usage_type': 'COGS_usage_type'})

    result_df['purchase_date_pst_pdt'] = pd.to_datetime(result_df['purchase_date_pst_pdt']).dt.date
    result_df['data_month_last_day'] = pd.to_datetime(result_df['data_month_last_day']).dt.date
    result_df['purchase_date_pst_pdt'] = result_df['purchase_date_pst_pdt'].fillna(result_df['data_month_last_day'])
    result_df['month_str'] = pd.to_datetime(result_df['purchase_date_pst_pdt']).dt.strftime("%b'%y")
    result_df['quarter_str'] = result_df['purchase_date_pst_pdt'].apply(lambda x: f"Q{((x.month - 1) // 3 + 1)}'{str(x.year)[-2:]}")

    result_df['brand'] = result_df['sku'].apply(lambda s: s.split('_', 1)[0] if isinstance(s, str) else None)
    result_df['main_component'] = result_df['sku'].apply(
        lambda s: s.split('_', 1)[-1].split('_', 1)[0] if isinstance(s, str) and '_' in s else None
    )

    # Create component_type column
    hardware_items = [
        '16GB DDR4 SODIMM', '16GB DDR5 SODIMM', '1TB PCIE 2242', '1TB PCIE 2280',
        '2TB PCIE 2280', '32GB DDR4 SODIMM', '32GB DDR5 SODIMM', '512GB PCIE 2242',
        '512GB PCIE 2280', '8GB DDR4 SODIMM', '8GB DDR5 SODIMM'
    ]
    result_df.loc[result_df['product'].notna(), 'component_type'] = 'PC'
    mask_hardware = result_df['product'].isin(hardware_items)
    mask_accessory = result_df['product'].str.contains('MICKEY CABEL', case=False, na=False)
    mask_os = result_df['product'].str.contains('WIN ', case=False, na=False)
    result_df.loc[mask_hardware, 'component_type'] = 'Hardware'
    result_df.loc[mask_accessory, 'component_type'] = 'Accessory'
    result_df.loc[mask_os, 'component_type'] = 'OS'

    # Calculate total COGS and Gross Margin
    # 1. Get revenue spread because now the same revenue has appeared for all COGS records that are using returns or initiations for a specific order id + sku
    # 2. Get revenue spread because now the same revenue has appeared for all products for a specific order id + sku
    result_df['product_for_revenue_spread'] = np.where(
        result_df['COGS_usage_type'] == 'COGS_use_returns_initiations',
        result_df['COGS_usage_type'] + result_df['fulfilled_by_PO'],
        result_df['COGS_usage_type'] + result_df['fulfilled_by_PO']+ result_df['product']
    )
    # Count distinct products per (order_id, sku)
    product_counts = (
        result_df.groupby(['amazon_order_id', 'sku'])['product_for_revenue_spread']
        .nunique()
        .reset_index(name='product_count')
    )
    result_df = result_df.merge(product_counts, on=['amazon_order_id', 'sku'], how='left')
    result_df['total_revenue'] = np.where(
        (result_df['COGS'] == 0) | (result_df['COGS'].isna()),
        result_df['total_revenue'],
        result_df['total_revenue'] / result_df['product_count']
    )

    return result_df

def get_PO_details_by_component_type(as_of_date: datetime, period_display: str):

    period_end = as_of_date.date()
    if period_display == 'month':
        period_start = datetime(as_of_date.year, as_of_date.month, 1)
        period_start = period_start.date()
    elif period_display == 'quarter':
        quarter_month = (as_of_date.month - 1) // 3 * 3 + 1
        period_start = datetime(as_of_date.year, quarter_month, 1)
        period_start = period_start.date()

    query1 = """
    select
        order_date,
        product,
        sum(COALESCE(total_cost,0)) as purchase_cost,
        sum(COALESCE(purchase_quantity,0)) as purchase_quantity
    from purchaseorders
    where CAST(order_date AS date) <= CAST(:as_of_date AS date) and CAST(order_date AS date) >= CAST(:period_start AS date)
    group by order_date, product
    """
    query1_params = {
        "as_of_date": period_end,
        "period_start": period_start
    }
    PO_result = pd.DataFrame(db.session.execute(text(query1), params=query1_params).mappings().all())

    if PO_result.empty:
        return jsonify({'error': 'No enough data available based on the selected filters.'}), 404
    
    else:
        query2 = """
        select
            distinct SKU as SKU
            from allorderspnl
        """
        unique_sku_result = pd.DataFrame(db.session.execute(text(query2)).mappings().all())

        # Get SKU example for PO product then use it to develop brank and main_component
        exceptions = ['ALEG', 'V3520']
        def custom_ir_extraction(product):
            if isinstance(product, str) and any(product.startswith(prefix) for prefix in exceptions):
                return product  # keep original
            else:
                return product.rsplit('-', 1)[0] if isinstance(product, str) and '-' in product else product
        PO_result['ir'] = PO_result['product'].apply(custom_ir_extraction)
        def first_matched_SKU(ir):
            matched = unique_sku_result[unique_sku_result['sku'].str.contains(f"{ir}", case=False, na=False)]
            return matched['sku'].iloc[0] if not matched.empty else None
        PO_result['sku_one_example'] = PO_result['ir'].apply(first_matched_SKU)
        PO_result = PO_result.drop(columns=['ir'])

        PO_result['brand'] = PO_result['sku_one_example'].apply(lambda s: s.split('_', 1)[0] if isinstance(s, str) else None)
        PO_result['main_component'] = PO_result['sku_one_example'].apply(
            lambda s: s.split('_', 1)[-1].split('_', 1)[0] if isinstance(s, str) and '_' in s else None
        )
        PO_result = PO_result.drop(columns=['sku_one_example'])
        # Create component_type column
        hardware_items = [
            '16GB DDR4 SODIMM', '16GB DDR5 SODIMM', '1TB PCIE 2242', '1TB PCIE 2280',
            '2TB PCIE 2280', '32GB DDR4 SODIMM', '32GB DDR5 SODIMM', '512GB PCIE 2242',
            '512GB PCIE 2280', '8GB DDR4 SODIMM', '8GB DDR5 SODIMM'
        ]
        PO_result.loc[PO_result['product'].notna(), 'component_type'] = 'PC'
        mask_hardware = PO_result['product'].isin(hardware_items)
        mask_accessory = PO_result['product'].str.contains('MICKEY CABEL', case=False, na=False)
        mask_os = PO_result['product'].str.contains('WIN ', case=False, na=False)
        PO_result.loc[mask_hardware, 'component_type'] = 'Hardware'
        PO_result.loc[mask_accessory, 'component_type'] = 'Accessory'
        PO_result.loc[mask_os, 'component_type'] = 'OS'

        return PO_result

def get_PO_average_cost_by_period():
    query1 = """
    select
        order_date,
        product,
        sum(COALESCE(purchase_unit_price,0) * COALESCE(fx_rate,1)) as purchase_unit_price,
        sum(COALESCE(purchase_quantity,0)) as purchase_quantity
    from purchaseorders
    group by order_date, product
    """
    PO_result = pd.DataFrame(db.session.execute(text(query1)).mappings().all())

    query2 = """
    select
        distinct sku as sku
        from allorderspnl
    """
    unique_sku_result = pd.DataFrame(db.session.execute(text(query2)).mappings().all())
    unique_sku_result = unique_sku_result.rename(columns={'sku': 'SKU'})

    exceptions = ['ALEG', 'V3520']
    def custom_ir_extraction(product):
        if isinstance(product, str) and any(product.startswith(prefix) for prefix in exceptions):
            return product  # keep original
        else:
            return product.rsplit('-', 1)[0] if isinstance(product, str) and '-' in product else product
    PO_result['ir'] = PO_result['product'].apply(custom_ir_extraction)
    def first_matched_SKU(ir):
        matched = unique_sku_result[unique_sku_result['SKU'].str.contains(f"{ir}", case=False, na=False)]
        return matched['SKU'].iloc[0] if not matched.empty else None
    PO_result['sku_one_example'] = PO_result['ir'].apply(first_matched_SKU)
    PO_result = PO_result.drop(columns=['ir'])

    return PO_result

def get_DSI(as_of_date: datetime, DSI_days: int):

    period_start = as_of_date - timedelta(days=DSI_days)
    period_start = period_start.date()
    period_end = as_of_date.date()

    query1 = """
    select
        sku,
        sum(COALESCE(cogs, 0)) as COGS
    from cogs
    where CAST(sales_date AS date) <= CAST(:as_of_date AS date) and CAST(sales_date AS date) >= CAST(:period_start AS date)
    group by sku
    """
    query1_params = {
        "as_of_date": period_end,
        "period_start": period_start
    }
    COGS_data = db.session.execute(text(query1), params=query1_params).mappings().all()
    COGS_result = pd.DataFrame(COGS_data) if COGS_data else pd.DataFrame(columns=['SKU', 'COGS'])
    COGS_result = COGS_result.rename(columns={'sku': 'SKU','cogs': 'COGS'})

    query2 = """
    select 
        sku,
        sum(COALESCE(inventory_value, 0)) as inventory_end_value
    from inventory
    where CAST(as_of_date AS date) = CAST(:as_of_date AS date)
    group by sku
    """
    query2_params = {
        "as_of_date": period_end
    }
    Inventory_end_data = db.session.execute(text(query2), params=query2_params).mappings().all()
    Inventory_end_result = pd.DataFrame(Inventory_end_data) if Inventory_end_data else pd.DataFrame(columns=['SKU', 'inventory_end_value'])
    Inventory_end_result = Inventory_end_result.rename(columns={'sku': 'SKU'})

    query3 = """
    select
        sku,
        sum(COALESCE(inventory_value, 0)) as inventory_start_value
    from inventory
    where CAST(as_of_date AS date) = CAST(:period_start AS date)
    group by sku
    """
    query3_params = {
        "period_start": period_start
    }
    Inventory_start_data = db.session.execute(text(query3), params=query3_params).mappings().all()
    Inventory_start_result = pd.DataFrame(Inventory_start_data) if Inventory_start_data else pd.DataFrame(columns=['SKU', 'inventory_start_value'])
    Inventory_start_result = Inventory_start_result.rename(columns={'sku': 'SKU'})

    result = pd.merge(COGS_result, Inventory_end_result, on='SKU', how='left')
    result = pd.merge(result, Inventory_start_result, on='SKU', how='left')

    def compute_dsi(row):
        cogs = row['COGS']
        inv_end = row['inventory_end_value']
        inv_start = row['inventory_start_value']

        if pd.isna(inv_end) or inv_end == 0:
            return 0
        elif pd.isna(inv_start) or inv_start == 0:
            avg_inventory = inv_end
        else:
            avg_inventory = (inv_end + inv_start) / 2

        if cogs == 0:
            return None
        else:
            return (avg_inventory / cogs) * DSI_days

    result['DSI'] = result.apply(compute_dsi, axis=1)
    return result

def get_procurement_AP(as_of_date: datetime):

    # parameters for initial equity to be deducted from procurement AP
    cutoff_date = datetime(2024, 7, 31)
    equity_deduction = 809998.6

    period_end = as_of_date.date()

    query1 = """
    select
        order_date,
        product,
        sum(COALESCE(total_cost, 0)) as procurement_cost
    from purchaseorders
    where CAST(order_date AS date) <= CAST(:as_of_date AS date)
    group by order_date, product
    """
    query1_params = {
        "as_of_date": period_end
    }
    procurement_cost_result = pd.DataFrame(db.session.execute(text(query1), params=query1_params).mappings().all())

    procurement_cost_result['order_date'] = pd.to_datetime(procurement_cost_result['order_date'])
    procurement_cost_result['data_month_last_day'] = procurement_cost_result['order_date'] + pd.offsets.MonthEnd(0)

    exceptions = ['ALEG', 'V3520']
    def custom_ir_extraction(product):
        if isinstance(product, str) and any(product.startswith(prefix) for prefix in exceptions):
            return product  # keep original
        else:
            return product.rsplit('-', 1)[0] if isinstance(product, str) and '-' in product else product
    procurement_cost_result['ir'] = procurement_cost_result['product'].apply(custom_ir_extraction)

    query2 = """
    select
        distinct sku as sku
        from allorderspnl
    """
    unique_sku_result = pd.DataFrame(db.session.execute(text(query2)).mappings().all())
    unique_sku_result = unique_sku_result.rename(columns={'sku': 'SKU'})

    def first_matched_SKU(ir):
        matched = unique_sku_result[unique_sku_result['SKU'].str.contains(f"{ir}", case=False, na=False)]
        return matched['SKU'].iloc[0] if not matched.empty else None
    procurement_cost_result['sku_one_example'] = procurement_cost_result['ir'].apply(first_matched_SKU)
    procurement_cost_result = procurement_cost_result.drop(columns=['ir'])
    procurement_cost_result['brand'] = procurement_cost_result['sku_one_example'].apply(lambda s: s.split('_', 1)[0] if isinstance(s, str) else None)
    procurement_cost_result['main_component'] = procurement_cost_result['sku_one_example'].apply(
        lambda s: s.split('_', 1)[-1].split('_', 1)[0] if isinstance(s, str) and '_' in s else None
    )
    procurement_cost_result = procurement_cost_result.drop(columns=['sku_one_example'])

    procurement_cost_result = procurement_cost_result.groupby(['data_month_last_day','main_component'])['procurement_cost'].sum().reset_index()

    # deduct initial equity purchased inventory
    procurement_cost_sum_til_Jul24 = procurement_cost_result[
        procurement_cost_result['data_month_last_day'] <= cutoff_date
    ]['procurement_cost'].sum()
    procurement_cost_result['procurement_cost_sum_til_Jul24'] = np.nan
    procurement_cost_result.loc[
        procurement_cost_result['data_month_last_day'] <= cutoff_date,
        'procurement_cost_sum_til_Jul24'
    ] = procurement_cost_sum_til_Jul24
    procurement_cost_result['percent_of_procurement_cost_sum_til_Jul24'] = 0
    procurement_cost_result.loc[
        procurement_cost_result['data_month_last_day'] <= cutoff_date,
        'percent_of_procurement_cost_sum_til_Jul24'
    ] = procurement_cost_result['procurement_cost'] / procurement_cost_sum_til_Jul24
    procurement_cost_result['value_to_deduct_til_Jul24'] = 0
    procurement_cost_result.loc[
        procurement_cost_result['data_month_last_day'] <= cutoff_date,
        'value_to_deduct_til_Jul24'
    ] = procurement_cost_result['percent_of_procurement_cost_sum_til_Jul24'] * equity_deduction
    procurement_cost_result['procurement_cost'] = procurement_cost_result['procurement_cost'] - procurement_cost_result['value_to_deduct_til_Jul24']

    min_data_month_last_day_universal = procurement_cost_result['data_month_last_day'].min()
    max_data_month_last_day_universal = as_of_date + pd.offsets.MonthEnd(0)
    all_months = pd.date_range(
        start=min_data_month_last_day_universal,
        end=max_data_month_last_day_universal,
        freq='ME'
    )
    main_components = procurement_cost_result['main_component'].unique()
    full_index = pd.MultiIndex.from_product(
        [all_months, main_components],
        names=['data_month_last_day', 'main_component']
    )
    full_grid = pd.DataFrame(index=full_index).reset_index()
    procurement_cost_result = pd.merge(
        full_grid,
        procurement_cost_result,
        on=['data_month_last_day', 'main_component'],
        how='left'
    )
    procurement_cost_result['procurement_cost'] = procurement_cost_result['procurement_cost'].fillna(0)

    procurement_cost_result = procurement_cost_result.sort_values(by=['main_component', 'data_month_last_day'])
    procurement_cost_result['cumulative_procurement_cost'] = (
        procurement_cost_result
        .groupby('main_component')['procurement_cost']
        .cumsum()
    )

    return procurement_cost_result

def get_AR_AP_by_date_with_statement_shipping_closing_forecast(brand: Optional[str] = None, ir: Optional[str] = None, forecast_revenue_method: str = "benchmark", year_end_total_revenue_target: Optional[float] = None, input_growth_rate: Optional[float] = None, FBMshipping_cost_to_revenue_ratio: Optional[float] = None):
    AR_AP_df = get_AR_AP_by_date()
    AR_AP_df['brand'] = AR_AP_df['sku'].apply(lambda s: s.split('_', 1)[0] if isinstance(s, str) else None)
    AR_AP_df['main_component'] = AR_AP_df['sku'].apply(
        lambda s: s.split('_', 1)[-1].split('_', 1)[0] if isinstance(s, str) and '_' in s else None
    )

    if brand is not None:
        AR_AP_df = AR_AP_df[AR_AP_df['brand'] == brand]
    if ir is not None:
        AR_AP_df = AR_AP_df[AR_AP_df['main_component'] == ir]
    AR_AP_df = AR_AP_df.groupby('date')[['AR','AP']].sum().reset_index()

    # actuals
    AR_AP_df_forecast_use = AR_AP_df.copy()
    AR_AP_df_forecast_use['data_month_last_day'] = AR_AP_df_forecast_use['date'] + pd.offsets.MonthEnd(0)
    AR_AP_df_forecast_use = AR_AP_df_forecast_use.groupby('data_month_last_day')[['AR','AP']].sum().reset_index()
    AR_AP_df_forecast_use['Indicator'] = 'Actuals'

    # forecast
    # initialize forecast dataframe with month_end dates for next 6 months
    max_month = AR_AP_df_forecast_use['data_month_last_day'].max()
    next_month_start = (max_month + pd.offsets.MonthBegin(1))
    max_month_next_6months = max_month + pd.DateOffset(months=6)
    max_month_next_6months = max_month_next_6months + pd.offsets.MonthEnd(0)
    month_ends = pd.date_range(
        start=next_month_start,
        end=max_month_next_6months,
        freq='M'  
    )
    forecast = pd.DataFrame({
        'Indicator': ['Forecast'] * len(month_ends),
        'data_month_last_day': month_ends
    })
    forecast['AR'] = np.nan
    forecast['AP'] = np.nan
    forecast['Indicator'] = 'Forecast'
    AR_AP_df_forecast_use = pd.concat([AR_AP_df_forecast_use, forecast], ignore_index=True)
    AR_AP_df_forecast_use = AR_AP_df_forecast_use.sort_values(by=['Indicator','data_month_last_day'])
    AR_AP_df_forecast_use = AR_AP_df_forecast_use.reset_index(drop=True)

    # build reference data
    actuals_df = AR_AP_df_forecast_use[AR_AP_df_forecast_use['Indicator'] == 'Actuals']
    actual_AR_by_month = dict(zip(actuals_df['data_month_last_day'], actuals_df['AR']))
    actual_AP_to_AR_average = actuals_df['AP'].sum() / actuals_df['AR'].sum()

    # Grab current year's revenue for forecast_revenue_method == 'target_revenue' scenario, calculat remaining revenue and months that need to solve for realize target
    current_year = max_month.year
    actuals_this_year = actuals_df[actuals_df['data_month_last_day'].dt.year == current_year]
    actual_months = len(actuals_this_year)
    actual_AR_sum = actuals_this_year['AR'].sum()
    latest_actual_AR = actuals_df.sort_values('data_month_last_day')['AR'].iloc[-1]
    if forecast_revenue_method == 'target_revenue':
        target_remaining = year_end_total_revenue_target - actual_AR_sum
        months_remaining = 12 - actual_months
        def revenue_sum_equation(growth):
            return sum([latest_actual_AR * (1 + growth)**i for i in range(1, months_remaining + 1)]) - target_remaining - 0.1
        try:
            result = root_scalar(revenue_sum_equation, method='brentq', bracket=[-1, 3.0])
            solved_growth = result.root
        except ValueError:
            solved_growth = 0

    # Loop over forecast rows
    last_forecasted_AR = None # Track last revenue (first from actuals, then from forecast)
    for idx, row in AR_AP_df_forecast_use[AR_AP_df_forecast_use['Indicator'] == 'Forecast'].iterrows():
        curr_month = row['data_month_last_day']
        last_year = curr_month.year - 1

        this_month_last_year = curr_month.replace(year=last_year)
        prev_month_last_year = this_month_last_year - pd.offsets.MonthEnd(1)

        AR_this = actual_AR_by_month.get(this_month_last_year)
        AR_prev = actual_AR_by_month.get(prev_month_last_year)

        # Determine the base revenue (first from actuals, then from forecast)
        if last_forecasted_AR is not None:
            base_AR = last_forecasted_AR
        else:
            base_AR = latest_actual_AR

        if forecast_revenue_method == 'benchmark':
            if AR_this is not None and AR_prev is not None and AR_this > 0 and AR_prev > 0:
                mom_growth = (AR_this - AR_prev) / AR_prev
            else:
                mom_growth = 0
        elif forecast_revenue_method == 'target_revenue':
            mom_growth = solved_growth
        elif forecast_revenue_method == 'flat_growth':
            mom_growth = input_growth_rate

        # Calculate forecasted revenue
        if base_AR is not None:
            forecast_value = base_AR * (1 + mom_growth) if mom_growth is not None else base_AR
            last_forecasted_AR = forecast_value

            AR_AP_df_forecast_use.at[idx, 'AR'] = forecast_value

    AR_AP_df_forecast_use['AP'] = np.where(
        AR_AP_df_forecast_use['Indicator'] == 'Forecast',
        AR_AP_df_forecast_use['AR'] * actual_AP_to_AR_average,
        AR_AP_df_forecast_use['AP']
    )
    AR_AP_df_forecast_use.rename(columns={'AR': 'AR_monthly', 'AP': 'AP_monthly'}, inplace=True)


    # extrapolate AR_AP_df (actual base AR AP by day) based on the monthly forecasted AR AP
    max_actual_date_add_1day = AR_AP_df['date'].max() + pd.DateOffset(days=1)
    forecast_date_ends = max_month_next_6months
    forecastARAP_date_range = pd.date_range(
        start=max_actual_date_add_1day,
        end=forecast_date_ends,
        freq='D'  
    )
    forecastARAP_df = pd.DataFrame({
        'date': forecastARAP_date_range
    })
    forecastARAP_df['date'] = forecastARAP_df['date'].dt.date
    forecastARAP_df['AR'] = np.nan
    forecastARAP_df['AP'] = np.nan

    AR_AP_df = pd.concat([AR_AP_df, forecastARAP_df], ignore_index=True)
    AR_AP_df['data_month_last_day'] = AR_AP_df['date'] + pd.offsets.MonthEnd(0)

    AR_AP_df['data_month_last_day'] = pd.to_datetime(AR_AP_df['data_month_last_day'])
    AR_AP_df['days_in_month'] = AR_AP_df['data_month_last_day'].dt.daysinmonth

    AR_AP_df = pd.merge(AR_AP_df, AR_AP_df_forecast_use, on='data_month_last_day', how='left')
    AR_AP_df['AR'] = np.where(
        pd.to_datetime(AR_AP_df['date']) >= max_actual_date_add_1day,
        AR_AP_df['AR_monthly']/AR_AP_df['days_in_month'],
        AR_AP_df['AR']
    )
    AR_AP_df['AP'] = np.where(
        pd.to_datetime(AR_AP_df['date']) >= max_actual_date_add_1day,
        AR_AP_df['AP_monthly']/AR_AP_df['days_in_month'],
        AR_AP_df['AP']
    )
    AR_AP_df = AR_AP_df.drop(columns=['data_month_last_day', 'days_in_month', 'AR_monthly', 'AP_monthly', 'Indicator'])

    statements_deposit_closing = get_statements_deposit_closing_AR_AP_by_date()
    statements_deposit_closing['brand'] = statements_deposit_closing['sku'].apply(lambda s: s.split('_', 1)[0] if isinstance(s, str) else None)
    statements_deposit_closing['main_component'] = statements_deposit_closing['sku'].apply(
        lambda s: s.split('_', 1)[-1].split('_', 1)[0] if isinstance(s, str) and '_' in s else None
    )

    if brand is not None:
        statements_deposit_closing = statements_deposit_closing[statements_deposit_closing['brand'] == brand]
    if ir is not None:
        statements_deposit_closing = statements_deposit_closing[statements_deposit_closing['main_component'] == ir]
    statements_deposit_closing = statements_deposit_closing.groupby('deposit_date_pst_pdt')[['AR_closing','AP_closing']].sum().reset_index()

    # merge AR_AP_df with statements_deposit_closing to get AR_cumulative and AP_cumulative
    AR_AP_df = pd.merge(
        AR_AP_df, 
        statements_deposit_closing, 
        left_on='date', 
        right_on='deposit_date_pst_pdt', 
        how='left'
    )
    AR_AP_df['AR_closing'] = AR_AP_df['AR_closing'].fillna(0)
    AR_AP_df['AP_closing'] = AR_AP_df['AP_closing'].fillna(0)
    AR_AP_df = AR_AP_df.sort_values(by='date')
    AR_AP_df['AR_cumulative'] = (AR_AP_df['AR'] - AR_AP_df['AR_closing']).cumsum()
    AR_AP_df['AP_cumulative'] = (AR_AP_df['AP'] - AR_AP_df['AP_closing']).cumsum()

    # generate deposit_date_list for actuals and forecast
    AR_AP_df['deposit_date_pst_pdt'] = pd.to_datetime(AR_AP_df['deposit_date_pst_pdt'], errors='coerce')
    deposit_date_pst_pdt_min = AR_AP_df['deposit_date_pst_pdt'].min()
    max_date = AR_AP_df['date'].max()
    deposit_date_list = pd.date_range(
        start=deposit_date_pst_pdt_min,
        end=max_date,
        freq='14D'
    )
    deposit_date_list_actual = AR_AP_df['deposit_date_pst_pdt'].unique()
    deposit_date_list_forecast = sorted(set(deposit_date_list) - set(deposit_date_list_actual))
    deposit_date_list_forecast = [d.date() for d in deposit_date_list_forecast]

    # get forecast assumptions for AR_paid_ratio and AP_paid_to_AR_paid_ratio
    AR_AP_df['AR_paid_ratio'] = np.where(
        AR_AP_df['deposit_date_pst_pdt'].isin(deposit_date_list),
        AR_AP_df['AR_closing'] / (AR_AP_df['AR_cumulative'] + AR_AP_df['AR_closing']),
        np.nan
    )
    AR_paid_ratio_avg_actual = AR_AP_df['AR_paid_ratio'].mean()
    AP_paid_to_AR_paid_ratio_avg_actual = AR_AP_df['AP_closing'].sum() / AR_AP_df['AR_closing'].sum()
    AR_AP_df.drop(columns=['AR_paid_ratio'], inplace=True)

    # update AR_AP_df with forecasted AR_closing and AP_closing and AR_cumulative and AP_cumulative
    for forecast_date in deposit_date_list_forecast:
        # Step 1: locate the row with matching deposit_date_pst_pdt
        row_mask = AR_AP_df['date'] == forecast_date
        if not row_mask.any():
            continue  # skip if the row doesn't exist

        row_index = AR_AP_df[row_mask].index[0]  # get the index of the matching row

        # Get current AR/AP cumulative
        current_AR_cum = AR_AP_df.at[row_index, 'AR_cumulative']
        current_AP_cum = AR_AP_df.at[row_index, 'AP_cumulative']

        # Step 2 & 3: Calculate closing values
        AR_closing = current_AR_cum * AR_paid_ratio_avg_actual
        AP_closing = AR_closing * AP_paid_to_AR_paid_ratio_avg_actual

        # Step 4 & 5: Update current row
        AR_AP_df.at[row_index, 'AR_closing'] = AR_closing
        AR_AP_df.at[row_index, 'AP_closing'] = AP_closing
        AR_AP_df.at[row_index, 'AR_cumulative'] = current_AR_cum - AR_closing
        AR_AP_df.at[row_index, 'AP_cumulative'] = current_AP_cum - AP_closing

        # Step 6: Update all rows after this row
        later_rows_mask = AR_AP_df['date'] > forecast_date
        AR_AP_df.loc[later_rows_mask, 'AR_cumulative'] -= AR_closing
        AR_AP_df.loc[later_rows_mask, 'AP_cumulative'] -= AP_closing

    # closing FBM shipping cost - assumption input shipping cost as 2.5% of AR
    if FBMshipping_cost_to_revenue_ratio is None:
        FBMshipping_cost_to_revenue_ratio = 0.025
    AR_AP_df['FBM_shipping_cost_forecast'] = np.where(
        AR_AP_df['date'] >= max_actual_date_add_1day.date(),
        AR_AP_df['AR'] * FBMshipping_cost_to_revenue_ratio,
        np.nan
    )
    AR_AP_df['data_month_last_day'] = AR_AP_df['date'] + pd.offsets.MonthEnd(0)
    monthly_shipping_sum = AR_AP_df.groupby('data_month_last_day')['FBM_shipping_cost_forecast'].sum()
    AR_AP_df['FBM_shipping_cost_forecast_monthly'] = AR_AP_df['date'].map(monthly_shipping_sum)
    AR_AP_df['FBM_shipping_cost_forecast_monthly'] = AR_AP_df['FBM_shipping_cost_forecast_monthly']*-1

    shipping_payment_date_list = pd.date_range(
        start=max_actual_date_add_1day.date(),
        end=max_date,
        freq='ME'
    )
    shipping_payment_date_list = [d.date() for d in shipping_payment_date_list]

    # update AR_AP_df with forecasted AP_closing for FBM shipping cost payment and AP_cumulative
    for shipping_payment_date in shipping_payment_date_list:
        # Step 1: locate the row with matching deposit_date_pst_pdt
        row_mask = AR_AP_df['date'] == shipping_payment_date
        if not row_mask.any():
            continue  # skip if the row doesn't exist

        row_index = AR_AP_df[row_mask].index[0]  # get the index of the matching row

        # Get current AP cumulative
        current_AP_cum = AR_AP_df.at[row_index, 'AP_cumulative']

        # Step 2 & 3: Get FBM shipping cost forecast and calculate closing values
        FBM_shipping_monthly_cost = AR_AP_df.at[row_index, 'FBM_shipping_cost_forecast_monthly']
        current_AP_closing = AR_AP_df.at[row_index, 'AP_closing']
        AR_AP_df.at[row_index, 'AP_closing'] = current_AP_closing + FBM_shipping_monthly_cost

        # Step 4: Update current row
        AR_AP_df.at[row_index, 'AP_cumulative'] = current_AP_cum - FBM_shipping_monthly_cost

        # Step 6: Update all rows after this row
        later_rows_mask = AR_AP_df['date'] > forecast_date
        AR_AP_df.loc[later_rows_mask, 'AP_cumulative'] -= FBM_shipping_monthly_cost
    
    AR_AP_df.drop(columns=['AR', 'AP','deposit_date_pst_pdt', 'FBM_shipping_cost_forecast', 'data_month_last_day', 'FBM_shipping_cost_forecast_monthly'], inplace=True)

    return AR_AP_df, max_actual_date_add_1day

def get_vendor_payment_paid_and_AP():
    query = """
    select 
        order_date,
        purchase_order_id,
        name,
        product,
        sum(COALESCE(total_cost, 0)) as total_cost
    from purchaseorders
    left join Suppliers on PurchaseOrders.supplier_id = Suppliers.supplier_id
    group by order_date, purchase_order_id, name, product
    """
    
    PO_result = pd.DataFrame(db.session.execute(text(query)).mappings().all())
    PO_result['order_date'] = pd.to_datetime(PO_result['order_date'])

    import os
    import sys
    current_directory = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(current_directory, os.pardir))
    sys.path.append(project_root)
    PO_paid_file_path = os.path.join(project_root, 'z. Input - CA Vendor PO Payment', 'PO_Payment_tilApr04_2025.csv')
    PO_paid = pd.read_csv(PO_paid_file_path)
    PO_paid['payment_date'] = pd.to_datetime(PO_paid['payment_date'])

    PO_result = pd.merge(
        PO_result,
        PO_paid,
        left_on=['purchase_order_id', 'product'],
        right_on=['PO', 'product'],
        how='left'
    )

    PO_result['vendor_AP'] = np.where(
        PO_result['name'].str.upper() != 'MMM',
        PO_result['total_cost']*1.13*-1,
        0
    )
    PO_result['vendor_AP'] = np.where(
        PO_result['payment_date'].notna(),
        0,
        PO_result['vendor_AP']
    )

    query = """
    select max(purchase_date_pst_pdt)
    from allorderspnl
    """
    latest_date_result = db.session.execute(text(query)).fetchone()
    if not latest_date_result or latest_date_result[0] is None:
        return jsonify({'error': 'No Orders data found'}), 404
    else:
        latest_date_result = latest_date_result[0]
        latest_date_result = datetime.strptime(latest_date_result, '%Y-%m-%d %H:%M:%S.%f')

    PO_result['vendor_AP_due_date'] = pd.NaT
    PO_result.loc[
        (PO_result['payment_date'].notna()) & (PO_result['name'].str.upper() != 'MMM'),
        'vendor_AP_due_date'
    ] = PO_result['order_date'] + pd.Timedelta(days=90)

    PO_result.loc[
        PO_result['vendor_AP_due_date'] <= latest_date_result,
        'vendor_AP_due_date'
    ] = latest_date_result + pd.Timedelta(days=90)

    return PO_result

def get_PO_ganntt_chart(start_date: datetime, end_date: datetime, default_fully_consumption_period: int = 60, brand: Optional[str] = None, ir: Optional[str] = None):
    query = """
        SELECT purchase_order_id, order_date, product, purchase_quantity
        FROM purchaseorders 
        WHERE CAST(order_date AS date) >= CAST(:start_date AS date) AND CAST(order_date AS date) <= CAST(:end_date AS date)
    """
    po_df = pd.DataFrame(db.session.execute(text(query), {'start_date': start_date, 'end_date': end_date}).mappings().all())

    # Fetch sales consumption data linked to PO
    consumption_query = """
        SELECT s.sales_record_id, s.fulfilled_by_PO, s.product, s.sales_date, s.quantity_sold, m.manufacture_completion_date
        FROM cogs s
        LEFT JOIN purchaseorders p ON s.fulfilled_by_PO = p.purchase_order_id AND s.product = p.product
        LEFT JOIN manufactureresult m ON s.result_id = m.manufacture_order_id AND s.manufacture_batch = m.manufacture_batch AND s.fulfilled_by_PO = m.fulfilled_by_PO AND s.product = m.product AND m.manufacture_order_id <> 0 AND m.manufacture_order_id <> -1
        WHERE CAST(p.order_date AS date) >= CAST(:start_date AS date) AND CAST(p.order_date AS date) <= CAST(:end_date AS date)
    """
    sales_df = pd.DataFrame(db.session.execute(text(consumption_query), {'start_date': start_date, 'end_date': end_date}).mappings().all())

    # Merge PO data with sales consumption
    merged_df = pd.merge(
        po_df, 
        sales_df, 
        left_on=['purchase_order_id', 'product'], 
        right_on=['fulfilled_by_PO', 'product'],
        how='left'
    )

    # Ensure date columns are in datetime format
    merged_df["order_date"] = pd.to_datetime(merged_df["order_date"], errors='coerce')
    merged_df["sales_date"] = pd.to_datetime(merged_df["sales_date"], errors='coerce')
    merged_df["manufacture_completion_date"] = pd.to_datetime(merged_df["manufacture_completion_date"], errors='coerce')

    # Filter data based on date range
    exceptions = ['ALEG', 'V3520']
    def custom_ir_extraction(product):
        if isinstance(product, str) and any(product.startswith(prefix) for prefix in exceptions):
            return product  # keep original
        else:
            return product.rsplit('-', 1)[0] if isinstance(product, str) and '-' in product else product
    merged_df['ir'] = merged_df['product'].apply(custom_ir_extraction)

    query_unique_sku = """
    select
        distinct sku as sku
        from allorderspnl
    """
    unique_sku_result = pd.DataFrame(db.session.execute(text(query_unique_sku)).mappings().all())
    unique_sku_result = unique_sku_result.rename(columns={'sku': 'SKU'})

    def first_matched_SKU(ir):
        matched = unique_sku_result[unique_sku_result['SKU'].str.contains(f"{ir}", case=False, na=False)]
        return matched['SKU'].iloc[0] if not matched.empty else None
    merged_df['sku_one_example'] = merged_df['ir'].apply(first_matched_SKU)
    merged_df = merged_df.drop(columns=['ir'])
    merged_df['brand'] = merged_df['sku_one_example'].apply(lambda s: s.split('_', 1)[0] if isinstance(s, str) else None)
    merged_df['main_component'] = merged_df['sku_one_example'].apply(
        lambda s: s.split('_', 1)[-1].split('_', 1)[0] if isinstance(s, str) and '_' in s else None
    )
    merged_df = merged_df.drop(columns=['sku_one_example'])
    merged_df = merged_df[merged_df['main_component'].notna()]

    if brand is not None:
        merged_df = merged_df[merged_df['brand'] == brand]
    if ir is not None:
        merged_df = merged_df[merged_df['main_component'] == ir]

    # Create a unique row label combining PO and product
    merged_df["PO_Product"] = merged_df["purchase_order_id"] + " - " + merged_df["product"]

    # Compute the bill date and sold quantity within the bill date
    merged_df["bill_date"] = merged_df["order_date"] + pd.Timedelta(days=default_fully_consumption_period)
    merged_df["quantity_sold_within_bill_date"] = merged_df.apply(
        lambda row: row["quantity_sold"] if row["sales_date"] <= row["bill_date"] else 0,
        axis=1
    )
    merged_df["total_quantity_sold_within_bill_date"] = merged_df.groupby("PO_Product")["quantity_sold_within_bill_date"].transform("sum")
    merged_df["sold_progress_within_bill_date_represented_by_date"] = merged_df.apply(
        lambda row: row["order_date"] + pd.Timedelta(days=round(row["total_quantity_sold_within_bill_date"] / (row["purchase_quantity"] / default_fully_consumption_period))),
        axis=1
    )

    # compute total quantity sold for PO_Product, keep only sales date if total quantity sold is equal to purchase_quantity
    merged_df["total_quantity_sold"] = merged_df.groupby("PO_Product")["quantity_sold"].transform("sum")
    merged_df["fully_consumed_PO_Product_Flag"] = merged_df.apply(
        lambda row: 'Fully Consumed' if row['total_quantity_sold'] == row['purchase_quantity'] else 'Not Fully Consumed',
        axis=1
    )
    merged_df["sales_date_for_fully_consumed_PO_Product"] = merged_df.apply(
        lambda row: row['sales_date'] if row['total_quantity_sold'] == row['purchase_quantity'] else None,
        axis=1
    )
    merged_df["completion_date_for_fully_consumed_PO_Product"] = merged_df.groupby("PO_Product")["sales_date_for_fully_consumed_PO_Product"].transform("max")
    merged_df.drop(columns=["sales_date_for_fully_consumed_PO_Product"], inplace=True)

    # if not fully consumed, find latest sales date and earliest manufacture completion date and calculate average daily consumption from earliest manufactured date to latest sales date
    # then calculate estimated completion date for fully consuming PO_Product
    query = """
        SELECT MAX(sales_date) as latest_sales_date
        FROM cogs
    """
    latest_sales_date = db.session.execute(text(query)).fetchone()
    latest_sales_date = pd.to_datetime(latest_sales_date[0])
    merged_df["latest_sales_date_for_not_fully_consumed"] = merged_df.apply(
        lambda row: latest_sales_date if row['fully_consumed_PO_Product_Flag'] == 'Not Fully Consumed' else None,
        axis=1
    )

    merged_df["earliest_manufacture_completion_date_all"] = merged_df.groupby("PO_Product")["manufacture_completion_date"].transform("min")
    merged_df["earliest_manufacture_completion_date_for_fully_consumed"] = merged_df.apply(
        lambda row: row["earliest_manufacture_completion_date_all"] if row['fully_consumed_PO_Product_Flag'] == 'Fully Consumed' else None,
        axis=1
    )
    merged_df["earliest_manufacture_completion_date_for_not_fully_consumed"] = merged_df.apply(
        lambda row: row["earliest_manufacture_completion_date_all"] if row['fully_consumed_PO_Product_Flag'] == 'Not Fully Consumed' else None,
        axis=1
    )
    merged_df.drop(columns=["earliest_manufacture_completion_date_all"], inplace=True)

    merged_df["average_daily_consumption_for_not_fully_consumed"] = merged_df.apply(
        lambda row: row["total_quantity_sold"] / ((row["latest_sales_date_for_not_fully_consumed"] - row["earliest_manufacture_completion_date_for_not_fully_consumed"]).days + 1)
        if row["fully_consumed_PO_Product_Flag"] == "Not Fully Consumed" 
        and pd.notna(row["earliest_manufacture_completion_date_for_not_fully_consumed"]) 
        and pd.notna(row["latest_sales_date_for_not_fully_consumed"]) 
        else None, 
        axis=1
    )

    merged_df["estimated_completion_date_for_not_fully_consumed"] = merged_df.apply(
        lambda row: row["earliest_manufacture_completion_date_for_not_fully_consumed"] + pd.Timedelta(days= math.ceil(row["purchase_quantity"]/row["average_daily_consumption_for_not_fully_consumed"]))+ pd.Timedelta(days=-1)
        if row["fully_consumed_PO_Product_Flag"] == "Not Fully Consumed" 
        and pd.notna(row["earliest_manufacture_completion_date_for_not_fully_consumed"]) 
        and pd.notna(row["latest_sales_date_for_not_fully_consumed"]) 
        else None, 
        axis=1
    )

    # Aggregate result for data feed for chart
    chart_df = merged_df.groupby(["PO_Product"]).agg({
        "fully_consumed_PO_Product_Flag": "first",
        "order_date": "first",
        "bill_date": "first",
        "sold_progress_within_bill_date_represented_by_date": "first",
        "earliest_manufacture_completion_date_for_fully_consumed": "first",
        "completion_date_for_fully_consumed_PO_Product": "first",
        "estimated_completion_date_for_not_fully_consumed": "first",
        
        "purchase_quantity": "first",
        "total_quantity_sold_within_bill_date": "first",
        "total_quantity_sold": "first",
        "average_daily_consumption_for_not_fully_consumed": "first"
    }).reset_index()

    # Clean outliers
    chart_df["estimated_completion_date_GT1year_flag"] = chart_df.apply(
        lambda row: 'Estimated Completion Date > 1 Year' 
        if pd.isna(row['estimated_completion_date_for_not_fully_consumed']) 
        or (row['estimated_completion_date_for_not_fully_consumed'] - row["bill_date"]).days + 1 > 365 
        else None,
        axis=1
    )
    chart_df["estimated_completion_date_for_not_fully_consumed"] = chart_df.apply(
        lambda row: row["bill_date"] + pd.Timedelta(days=365) 
        if pd.isna(row['estimated_completion_date_for_not_fully_consumed']) 
        or (row['estimated_completion_date_for_not_fully_consumed'] - row["bill_date"]).days + 1 > 365 
        else row['estimated_completion_date_for_not_fully_consumed'],
        axis=1
    )
    
    chart_df = chart_df.sort_values(by="order_date", ascending=False)

    min_date = chart_df["order_date"].min()
    if min_date.day == 1:
        min_date = min_date - pd.Timedelta(days=5)
    else:
        min_date = min_date.replace(day=1)
    max_date = chart_df["estimated_completion_date_for_not_fully_consumed"].max()+ pd.Timedelta(days=30)
    
    # Define axis range in days (for bar positioning)
    x_axis_begin = 0
    x_axis_end = (max_date - min_date).days + x_axis_begin
    
    # Create date ticks for x-axis
    date_range = pd.date_range(start=min_date, end=max_date, freq='MS')  # Monthly start dates
    date_ticks = [d.strftime("%b'%y") for d in date_range]
    date_positions = [(d - min_date).days for d in date_range]

    # Plot Using Plotly
    fig = go.Figure()

    # Add completion date/ estimated completion date bars (border only)
    first_trace1 = True
    first_trace2 = True
    for _, row in chart_df.iterrows():
        if row["fully_consumed_PO_Product_Flag"] == "Fully Consumed":

            text_hover_info = f"Manufacture Start Date: {row['earliest_manufacture_completion_date_for_fully_consumed'].strftime('%Y-%m-%d')}<br>" \
                              f"Fully Consumed by: {row['completion_date_for_fully_consumed_PO_Product'].strftime('%Y-%m-%d')}" \

            fig.add_trace(go.Bar(
                x=[(row["completion_date_for_fully_consumed_PO_Product"] - row["earliest_manufacture_completion_date_for_fully_consumed"]).days + x_axis_begin],  # End at completion_date_for_fully_consumed_PO_Product
                base=(row["earliest_manufacture_completion_date_for_fully_consumed"] - min_date).days + x_axis_begin,  # Start at earliest_manufacture_completion_date_for_fully_consumed
                y=[row["PO_Product"]],
                name="Manufacture to Full Consumption",
                marker=dict(color="rgba(180,229,162,1)", line=dict(color="rgba(180,229,162,1)", width=2)),  # Border only
                orientation="h",
                width = 0.8,
                hoverinfo="text",  
                hovertext=text_hover_info,
                hoverlabel=dict(
                    bgcolor="green",  
                    font_color="white",  
                    bordercolor="green"
                ),
                showlegend = first_trace1
            ))
            first_trace1 = False
        else:
            # Replace bar with dashed line with arrow
            start_x = (row["bill_date"] - min_date).days + x_axis_begin
            end_x = (row["estimated_completion_date_for_not_fully_consumed"] - min_date).days + x_axis_begin

            # Add dashed line
            fig.add_trace(go.Scatter(
                x=[start_x, end_x],
                y=[row["PO_Product"], row["PO_Product"]],
                mode="lines",
                line=dict(color="red", width=2, dash="dash"),
                name="Bill Date to Est. Full Consumption",
                hoverinfo="none",  # Disable default hover 
                showlegend = first_trace2
            ))
            first_trace2 = False

            # Add text annotation
            if row["estimated_completion_date_GT1year_flag"] is None:
                text_info = f"Consumption Progress: {round(row['total_quantity_sold'])}/{round(row['purchase_quantity'])} = {round(row['total_quantity_sold']/row['purchase_quantity']*100)}%&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<br>" \
                            f"Average Daily Sales Quantity: {round(row['average_daily_consumption_for_not_fully_consumed'],2)}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<br>" \
                            f"Estimated Fully Consumed by: {row['estimated_completion_date_for_not_fully_consumed'].strftime('%Y-%m-%d')}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"
                fig.add_trace(go.Scatter(
                    x=[end_x+1],  # Position the text at the right end of the line
                    y=[row["PO_Product"]],
                    mode="text",
                    text=[text_info],  # Text to be displayed
                    textposition="top left",  # Adjust text placement
                    textfont=dict(color="red", size=9),  # Ensure visibility
                    showlegend=False  # Do not show in legend
                ))
            else:
                if row['total_quantity_sold'] == 0:
                    text_info = f"Consumption Progress: 0/{round(row['purchase_quantity'])} = 0%&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<br>" \
                                f"Average Daily Sales Quantity: No Sales Records&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<br>" \
                                f"Estimated Fully Consumed by: > 1 year&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"
                    fig.add_trace(go.Scatter(
                        x=[end_x+1],  # Position the text at the right end of the line
                        y=[row["PO_Product"]],
                        mode="text",
                        text=[text_info],  # Text to be displayed
                        textposition="top left",  # Adjust text placement
                        textfont=dict(color="red", size=9),  # Ensure visibility
                        showlegend=False  # Do not show in legend
                    ))
                else:
                    text_info = f"Consumption Progress: {round(row['total_quantity_sold'])}/{round(row['purchase_quantity'])} = {round(row['total_quantity_sold']/row['purchase_quantity']*100)}%&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<br>" \
                                f"Average Daily Sales Quantity: {round(row['average_daily_consumption_for_not_fully_consumed'],2)}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<br>" \
                                f"Estimated Fully Consumed by: > 1 year&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"
                    fig.add_trace(go.Scatter(
                        x=[end_x+1],  # Position the text at the right end of the line
                        y=[row["PO_Product"]],
                        mode="text",
                        text=[text_info],  # Text to be displayed
                        textposition="top left",  # Adjust text placement
                        textfont=dict(color="red", size=9),  # Ensure visibility
                        showlegend=False  # Do not show in legend
                    ))
            
            # Add arrow at the end
            fig.add_annotation(
                x=end_x,
                y=row["PO_Product"],
                ax=end_x - 5,  # Arrow starts 3 days before end
                ay=row["PO_Product"],
                xref="x",
                yref="y",
                axref="x",
                ayref="y",
                showarrow=True,
                arrowhead=1,
                arrowsize=1.5,
                arrowwidth=2,
                arrowcolor="red"
            )

    # Add progress within bill date bars (shade only)
    first_trace = True
    for _, row in chart_df.iterrows():

        progress_within_bill_date_percentage = round(row["total_quantity_sold_within_bill_date"] / row["purchase_quantity"] * 100)

        text_hover_info = f"Delivery Date: {row['order_date'].strftime('%Y-%m-%d')}<br>" \
                          f"Bill Date: {row['bill_date'].strftime('%Y-%m-%d')}<br>" \
                          f"Purchase Quantity: {round(row['purchase_quantity'])}<br>" \
                          f"Total Quantity Sold within Bill Date: {round(row['total_quantity_sold_within_bill_date'])}"

        fig.add_trace(go.Bar(
            x=[(row["sold_progress_within_bill_date_represented_by_date"] - row["order_date"]).days + x_axis_begin],  # End at sold_progress_within_bill_date_represented_by_date
            base=(row["order_date"] - min_date).days + x_axis_begin,  # Start at order_date
            y=[row["PO_Product"]],
            name="Consumption % within Bill Date",
            marker=dict(color="rgba(209,209,209,1)", line=dict(color="rgba(209,209,209,1)", width=2)),  # Shade only
            orientation="h",
            width = 0.5,
            hoverinfo="text",  
            hovertext=text_hover_info,
            hoverlabel=dict(
                bgcolor="blue",  
                font_color="white",  
                bordercolor="blue"
            ),
            text=f"{progress_within_bill_date_percentage}%",  # Add percentage text
            textposition="inside",  # Position text inside the bar
            insidetextanchor="end",  # Align text at the end of the bar (leftward)
            textfont=dict(color="black"),  # Adjust text color and size
            showlegend = first_trace
        ))

        first_trace = False

    # Add target bars (border only)
    first_trace = True
    for _, row in chart_df.iterrows():

        text_hover_info = f"Delivery Date: {row['order_date'].strftime('%Y-%m-%d')}<br>" \
                          f"Bill Date: {row['bill_date'].strftime('%Y-%m-%d')}<br>" \
                          f"Purchase Quantity: {round(row['purchase_quantity'])}<br>" \
                          f"Total Quantity Sold within Bill Date: {round(row['total_quantity_sold_within_bill_date'])}"

        fig.add_trace(go.Bar(
            x=[(row["bill_date"] - row["order_date"]).days + x_axis_begin],  # End at bill_date
            base=(row["order_date"] - min_date).days + x_axis_begin,  # Start at order_date
            y=[row["PO_Product"]],
            name="Delivery to Bill Period",
            marker=dict(color="rgba(0,0,0,0)", line=dict(color="blue", width=2)),  # Border only
            orientation="h",
            width = 0.5,
            hoverinfo="text",  
            hovertext=text_hover_info,
            hoverlabel=dict(
                bgcolor="blue",  
                font_color="white",  
                bordercolor="blue"
            ),
            showlegend = first_trace
        ))

        first_trace = False

    # Configure Layout
    fig.update_layout(
        autosize=True,
        margin=dict(l=20, r=0, t=0, b=10),
        barmode="overlay",  # Overlapping bars
        xaxis=dict(
            side="top",  # Move x-axis to the top
            ticklabelposition="outside top",
            range=[x_axis_begin, x_axis_end],  # Dynamically set X-axis range
            tickvals=date_positions,  # Positions of the ticks (in days)
            ticktext=date_ticks,      # Labels for the ticks (formatted dates)
            # tickangle=-45             # Angle the dates for better readability
            tickfont=dict(weight="bold", color="black", size=10),
            ticklabelstandoff=15
        ),
        yaxis=dict(
            ticksuffix="         ",
            tickfont=dict(weight="bold", color="black", size=10),  
            automargin=True  # Prevents label cut-off
        ),
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=1.05,            # Just above chart
            xanchor="right",    # Start at very left (includes y-axis margin)
            x=1,               # Full left alignment
            font=dict(size=10)
        ),
        paper_bgcolor="rgba(0,0,0,0)",  # Transparent background outside the plot
        plot_bgcolor="rgba(0,0,0,0)",   # Transparent background inside the plot
        # Completely disable the default hover behavior
        # hovermode=True,  # Disable the built-in hover mode
        # Add a shape for the hover line (will be controlled by JavaScript)
        shapes=[
            dict(
                type="line",
                xref="x",
                yref="paper",
                x0=0,
                y0=0,
                x1=0,
                y1=1,
                line=dict(
                    color="rgba(0, 0, 0, 0.5)",
                    width=1,
                    dash="dash"
                ),
                visible=False
            )
        ]
    )

    # Add custom JavaScript for dynamic hover line
    fig.update_layout(
        updatemenus=[
            dict(
                type="buttons",
                showactive=False,
                buttons=[
                    dict(
                        label="",
                        method="relayout",
                        args=["shapes[0].visible", True],
                        visible=False
                    )
                ]
            )
        ]
    )
    
    # Store min_date as a string for JavaScript
    min_date_str = min_date.strftime('%Y-%m-%d')
    
    # Add custom JavaScript to update the hover line position and show date
    custom_js = f"""
    <script>
    var plotDiv = document.getElementsByClassName('plotly-graph-div')[0];
    // Create a date object from the min_date string
    var minDateParts = '{min_date_str}'.split('-');
    var minDate = new Date(
        parseInt(minDateParts[0]), // year
        parseInt(minDateParts[1]) - 1, // month (0-based in JavaScript)
        parseInt(minDateParts[2]) // day
    );
    var plotArea = plotDiv.querySelector('.plot-container');
    var xaxisRange = [{x_axis_begin}, {x_axis_end}];
    
    // Function to format date as YYYY-MM-DD
    function formatDate(date) {{
        var year = date.getFullYear();
        var month = ('0' + (date.getMonth() + 1)).slice(-2);
        var day = ('0' + date.getDate()).slice(-2);
        return year + '-' + month + '-' + day;
    }}
    
    // Create a custom hover label div
    var customHoverDiv = document.createElement('div');
    customHoverDiv.style.position = 'absolute';
    customHoverDiv.style.backgroundColor = 'white';
    customHoverDiv.style.border = '1px solid black';
    customHoverDiv.style.padding = '5px';
    customHoverDiv.style.borderRadius = '3px';
    customHoverDiv.style.pointerEvents = 'none';
    customHoverDiv.style.display = 'none';
    customHoverDiv.style.zIndex = 1000;
    customHoverDiv.style.fontFamily = 'Arial';
    customHoverDiv.style.fontSize = '12px';
    document.body.appendChild(customHoverDiv);
    
    // Function to get x-coordinate relative to the plot area
    function getXCoordinate(event) {{
        var plotRect = plotDiv.querySelector('.plot-container .main-svg').getBoundingClientRect();
        var plotAreaRect = plotDiv.querySelector('.plot-container .main-svg .xy').getBoundingClientRect();
        
        // Get the x-axis range in pixels
        var xAxisLeft = plotAreaRect.left;
        var xAxisRight = plotAreaRect.right;
        var xAxisWidth = xAxisRight - xAxisLeft;
        
        // Calculate the x-coordinate as a percentage of the x-axis width
        var xCoordPct = (event.clientX - xAxisLeft) / xAxisWidth;
        
        // Convert to the data range
        var xCoord = xaxisRange[0] + xCoordPct * (xaxisRange[1] - xaxisRange[0]);
        
        return {{
            xCoord: xCoord,
            inPlotArea: (
                event.clientX >= xAxisLeft && 
                event.clientX <= xAxisRight && 
                event.clientY >= plotAreaRect.top && 
                event.clientY <= plotAreaRect.bottom
            )
        }};
    }}
    
    // Handle mouse move over the entire plot
    plotDiv.addEventListener('mousemove', function(e) {{
        var result = getXCoordinate(e);
        var xval = result.xCoord;
        
        if (result.inPlotArea) {{
            // Calculate the actual date by adding days to minDate
            // Create a new date object to avoid modifying the original
            var hoverDate = new Date(minDate.getTime());
            // Add the days
            hoverDate.setDate(minDate.getDate() + Math.floor(xval));
            var dateStr = formatDate(hoverDate);
            
            // Update the custom hover label
            customHoverDiv.innerHTML = '<b>' + dateStr + '</b>';
            customHoverDiv.style.display = 'block';
            customHoverDiv.style.left = (e.clientX + 10) + 'px';
            customHoverDiv.style.top = (e.clientY - 30) + 'px';
            
            // Update the vertical line position
            var update = {{
                'shapes[0].x0': xval,
                'shapes[0].x1': xval,
                'shapes[0].visible': true
            }};
            Plotly.relayout(plotDiv, update);
        }} else {{
            // Hide the custom hover label and line when outside plot area
            customHoverDiv.style.display = 'none';
            var update = {{
                'shapes[0].visible': false
            }};
            Plotly.relayout(plotDiv, update);
        }}
    }});
    
    // Hide everything when mouse leaves the plot
    plotDiv.addEventListener('mouseleave', function(e) {{
        customHoverDiv.style.display = 'none';
        var update = {{
            'shapes[0].visible': false
        }};
        Plotly.relayout(plotDiv, update);
    }});
    </script>
    """
    
    # Generate the HTML string
    print("Generating Plotly figure")
    html_content = fig.to_html(include_plotlyjs=True, full_html=True)
    html_content = html_content.replace("</body>", custom_js + "</body>")

    return html_content

def get_operating_expenses_breakdown(as_of_date: datetime, period_display: str):
    # Determine the start date based on period display
    if period_display == 'month':
        month_start = datetime(as_of_date.year, as_of_date.month, 1)
        month_end_list = [datetime(
        as_of_date.year,
        as_of_date.month,
        monthrange(as_of_date.year, as_of_date.month)[1]
        ).date()]
    elif period_display == 'quarter':
        quarter_month = (as_of_date.month - 1) // 3 * 3 + 1
        month_start = datetime(as_of_date.year, quarter_month, 1)
        month_end_list = [d.to_pydatetime().date() for d in pd.date_range(
            start=month_start,
            end=as_of_date,
            freq='M'
        )]
    elif period_display == 'year':
        month_start = datetime(as_of_date.year, 1, 1)
        month_end_list = [d.to_pydatetime().date() for d in pd.date_range(
            start=month_start,
            end=as_of_date,
            freq='M'
        )]
    
    month_end_param_keys = [f"month_end_{i}" for i in range(len(month_end_list))]
    month_end_param_placeholders = ', '.join(f":{key}" for key in month_end_param_keys)
    month_end_params = {key: val for key, val in zip(month_end_param_keys, month_end_list)}

    query = """
    with order_settlement_data as (
    select 
            purchase_date_pst_pdt,
            data_month_last_day,
            sales_status,
            payment_status,
            amazon_order_id,
            sku,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_item_price, 0)
                        + COALESCE(statements_shipping_price, 0)
                        + COALESCE(statements_gift_wrap_price, 0)
                        + COALESCE(statements_item_tax, 0)
                        + COALESCE(statements_shipping_tax, 0)
                        + COALESCE(statements_gift_wrap_tax, 0)
                        + COALESCE(statements_order_other, 0)
                        + COALESCE(returns_shipping_chargeback, 0)
                        + COALESCE(returns_gift_wrap_chargeback, 0)
                        + COALESCE(returns_item_promotion_discount, 0)	
                        + COALESCE(returns_ship_promotion_discount, 0)	
                        + COALESCE(returns_commission, 0)	
                        + COALESCE(returns_digital_services_fee, 0)	
                        + COALESCE(returns_fbm_shipping_commission, 0)	
                        + COALESCE(returns_marketplace_facilitator_tax_principal, 0)	
                        + COALESCE(returns_marketplace_facilitator_tax_shipping, 0)	
                        + COALESCE(statements_return_other, 0)	
                            + COALESCE(statements_other_allocated, 0)
                        + COALESCE(statements_non_sku_adjustments, 0)
                    else
                        COALESCE(item_price, 0)	
                        + COALESCE(shipping_price, 0)	
                        + COALESCE(gift_wrap_price, 0)	
                        + COALESCE(item_tax, 0)	
                        + COALESCE(shipping_tax, 0)	
                        + COALESCE(gift_wrap_tax, 0)
                end
            ) as total_revenue,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_shipping_chargeback, 0)
                        + COALESCE(statements_gift_wrap_chargeback, 0)
                        + COALESCE(statements_item_promotion_discount, 0)	
                        + COALESCE(statements_ship_promotion_discount, 0)	
                        + COALESCE(statements_promotion_deal_coupon_fees_allocated, 0)	
                        + COALESCE(statements_commission, 0)	
                        + COALESCE(statements_sponsored_products_charge_allocated, 0)	
                        + COALESCE(statements_sales_tax_service_fee, 0)	
                        + COALESCE(statements_digital_services_fee, 0)	
                        + COALESCE(statements_fba_fulfillment_fee, 0)
                        + COALESCE(fba_inbound_transportation_fee, 0)	
                        + COALESCE(statements_fba_storage_fee_allocated, 0)	
                        + COALESCE(statements_fbm_shipping_commission, 0)	
                        + COALESCE(statements_subscription_fee_allocated, 0)	
                        + COALESCE(statements_marketplace_facilitator_tax_principal, 0)	
                        + COALESCE(statements_marketplace_facilitator_tax_shipping, 0)	
                        + COALESCE(returns_shipping_price, 0)	
                        + COALESCE(returns_gift_wrap_price, 0)	
                        + COALESCE(returns_item_tax, 0)	
                        + COALESCE(returns_shipping_tax, 0)	
                        + COALESCE(returns_gift_wrap_tax, 0)		
                        + COALESCE(returns_refund_commission, 0)	
                    else
                        COALESCE(item_promotion_discount, 0)	
                        + COALESCE(ship_promotion_discount, 0)	
                        + COALESCE(commission, 0)	
                        + COALESCE(sponsored_products_charge, 0)	
                        + COALESCE(sales_tax_service_fee, 0)	
                        + COALESCE(marketplace_facilitator_tax_principal, 0)	
                        + COALESCE(marketplace_facilitator_tax_shipping, 0)
                        + COALESCE(digital_services_fee, 0)	
                        + COALESCE(fba_fulfillment_fee, 0)	
                        + COALESCE(fba_inbound_transportation_fee, 0)	
                        + COALESCE(fba_storage_fee, 0)	
                        + COALESCE(fbm_shipping_commission, 0)	
                        + COALESCE(subscription_fee, 0)	
                end
            ) as total_operating_expenses,
            sum(
                case when payment_status = 'Paid'
                    then 	
                        COALESCE(statements_commission, 0)		
                    else
                        COALESCE(commission, 0)	
                end
            ) as operating_expenses_commission,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_item_promotion_discount, 0)	
                        + COALESCE(statements_ship_promotion_discount, 0)	
                        + COALESCE(statements_promotion_deal_coupon_fees_allocated, 0)	
                    else
                        COALESCE(item_promotion_discount, 0)	
                        + COALESCE(ship_promotion_discount, 0)
                end
            ) as operating_expenses_promotions,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_sponsored_products_charge_allocated, 0)	
	
                    else
                        COALESCE(sponsored_products_charge, 0)	
                end
            ) as operating_expenses_advertisements,
            sum(
                case when payment_status = 'Paid'
                    then 
	                    COALESCE(statements_fba_fulfillment_fee, 0)
                        + COALESCE(fba_inbound_transportation_fee, 0)	
                        + COALESCE(statements_fba_storage_fee_allocated, 0)	
                    else
                        COALESCE(fba_fulfillment_fee, 0)	
                        + COALESCE(fba_inbound_transportation_fee, 0)	
                        + COALESCE(fba_storage_fee, 0)		
                end
            ) as operating_expenses_fba_fees,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_FBM_shipping_commission, 0)		
                    else
                        COALESCE(FBM_shipping_commission, 0)	
                end
            ) as operating_expenses_fbm_fees,
                        sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_sales_tax_service_fee, 0)	
                        + COALESCE(statements_digital_services_fee, 0)	
                        + COALESCE(statements_subscription_fee_allocated, 0)		
                    else
                        COALESCE(sales_tax_service_fee, 0)	
                        + COALESCE(digital_services_fee, 0)	
                        + COALESCE(subscription_fee, 0)	
                end
            ) as operating_expenses_service_fees,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_marketplace_facilitator_tax_principal, 0)	
                        + COALESCE(statements_marketplace_facilitator_tax_shipping, 0)		
                    else
                        COALESCE(marketplace_facilitator_tax_principal, 0)	
                        + COALESCE(marketplace_facilitator_tax_shipping, 0)	
                end
            ) as operating_expenses_marketplace_facilitator_tax,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_shipping_chargeback, 0)
                        + COALESCE(statements_gift_wrap_chargeback, 0)	
                end
            ) as operating_expenses_revenue_chargebacks,
            sum( 
                COALESCE(returns_shipping_price, 0)	
                + COALESCE(returns_gift_wrap_price, 0)	
                + COALESCE(returns_item_tax, 0)	
                + COALESCE(returns_shipping_tax, 0)	
                + COALESCE(returns_gift_wrap_tax, 0)		
                + COALESCE(returns_refund_commission, 0)	
            ) as operating_expenses_returns
    from allorderspnl
        where (CAST(purchase_date_pst_pdt AS timestamp) <= CAST(:as_of_date AS timestamp) and CAST(purchase_date_pst_pdt AS timestamp) >= CAST(:month_start AS timestamp))
          or (purchase_date_pst_pdt is null and data_month_last_day IN ({month_end_param_placeholders}))
        group by purchase_date_pst_pdt, data_month_last_day, sales_status, payment_status, amazon_order_id, sku
    )
    select 
        o.purchase_date_pst_pdt,
        o.data_month_last_day,
        o.sales_status,
        o.payment_status,
        o.amazon_order_id,
        o.sku,
        sum(COALESCE(total_revenue, 0)) as total_revenue,
        sum(COALESCE(total_operating_expenses, 0)) as total_operating_expenses,
        sum(COALESCE(operating_expenses_commission, 0)) as operating_expenses_commission,
        sum(COALESCE(operating_expenses_promotions, 0)) as operating_expenses_promotions,
        sum(COALESCE(operating_expenses_advertisements, 0)) as operating_expenses_advertisements,
        sum(COALESCE(operating_expenses_fba_fees, 0)) as operating_expenses_fba_fees,
        sum(COALESCE(operating_expenses_fbm_fees, 0)) as operating_expenses_fbm_fees,
        sum(COALESCE(operating_expenses_service_fees, 0)) as operating_expenses_service_fees,
        sum(COALESCE(operating_expenses_marketplace_facilitator_tax, 0)) as operating_expenses_marketplace_facilitator_tax,
        sum(COALESCE(operating_expenses_revenue_chargebacks, 0)) as operating_expenses_revenue_chargebacks,
        sum(COALESCE(operating_expenses_returns, 0)) as operating_expenses_returns,
        sum(COALESCE(shipping_cost, 0)) as shipping_cost
    from order_settlement_data as o
    left join (select order_id, sum(COALESCE(shipping_cost, 0)) as shipping_cost from fbmshippingcost group by order_id) as FBMShippingCost
    on o.amazon_order_id = FBMShippingCost.order_id
    group by o.purchase_date_pst_pdt, o.data_month_last_day, o.sales_status, o.payment_status, o.amazon_order_id, o.sku 
    """
    
    query_params = {
        "as_of_date": as_of_date,
        "month_start": month_start,
        **month_end_params
    }
    result = db.session.execute(
        text(query.format(month_end_param_placeholders=month_end_param_placeholders)),
        query_params
    ).mappings().all()

    if not result:
        return pd.DataFrame(columns=[
            'purchase_date_pst_pdt', 'data_month_last_day', 'sales_status', 'payment_status', 'sku',
            'total_revenue', 'total_operating_expenses',
            'operating_expenses_commission',
            'operating_expenses_promotions', 'operating_expenses_advertisements',
            'operating_expenses_FBA_fees', 'operating_expenses_FBM_fees','operating_expenses_FBM_shipping',
            'operating_expenses_service_fees', 'operating_expenses_marketplace_facilitator_tax',
            'operating_expenses_revenue_chargebacks',
            'operating_expenses_returns'
        ])
    else:
        result = pd.DataFrame(result)
        result = result.rename(columns={'operating_expenses_fba_fees': 'operating_expenses_FBA_fees','operating_expenses_fbm_fees': 'operating_expenses_FBM_fees'})
        order_id_sku_count = result.groupby('amazon_order_id')['sku'].count()
        result['order_id_sku_count'] = result['amazon_order_id'].map(order_id_sku_count)
        result['operating_expenses_FBM_shipping'] = np.where(
            result['order_id_sku_count'] > 0,
            result['shipping_cost'] / result['order_id_sku_count'],
            0
        )
        result['total_operating_expenses'] = result['total_operating_expenses'] + result['shipping_cost']
        result = result.drop(columns=['order_id_sku_count', 'shipping_cost','amazon_order_id'])

        result['purchase_date_pst_pdt'] = result['purchase_date_pst_pdt'].fillna(pd.to_datetime('2099-12-31').date())
        result['sku'] = result['sku'].fillna('NonSKU_NonSKU_NonSKU')
        result = result.groupby(['purchase_date_pst_pdt', 'data_month_last_day', 'sales_status', 'payment_status', 'sku']).sum().reset_index()
        result['purchase_date_pst_pdt'] = result['purchase_date_pst_pdt'].replace(pd.to_datetime('2099-12-31').date(), pd.NaT)
        result['sku'] = result['sku'].replace('NonSKU_NonSKU_NonSKU', np.nan)

        desired_column_order = [
            'purchase_date_pst_pdt', 'data_month_last_day', 'sales_status', 'payment_status', 'sku',
            'total_revenue', 'total_operating_expenses',
            'operating_expenses_commission',
            'operating_expenses_promotions', 'operating_expenses_advertisements',
            'operating_expenses_FBA_fees', 'operating_expenses_FBM_fees', 'operating_expenses_FBM_shipping',
            'operating_expenses_service_fees', 'operating_expenses_marketplace_facilitator_tax',
            'operating_expenses_revenue_chargebacks',
            'operating_expenses_returns'
        ]

        # Reorder the DataFrame
        result = result[desired_column_order]


        return result

def get_operating_expenses_breakdown_since_beginning(as_of_date: datetime):

    # Determine end date for no sales time
    month_end = datetime(as_of_date.year, as_of_date.month, monthrange(as_of_date.year, as_of_date.month)[1]).date()

    query = """
    with order_settlement_data as (
    select 
            purchase_date_pst_pdt,
            data_month_last_day,
            sales_status,
            payment_status,
            amazon_order_id,
            sku,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_item_price, 0)
                        + COALESCE(statements_shipping_price, 0)
                        + COALESCE(statements_gift_wrap_price, 0)
                        + COALESCE(statements_item_tax, 0)
                        + COALESCE(statements_shipping_tax, 0)
                        + COALESCE(statements_gift_wrap_tax, 0)
                        + COALESCE(statements_order_other, 0)
                        + COALESCE(returns_shipping_chargeback, 0)
                        + COALESCE(returns_gift_wrap_chargeback, 0)
                        + COALESCE(returns_item_promotion_discount, 0)	
                        + COALESCE(returns_ship_promotion_discount, 0)	
                        + COALESCE(returns_commission, 0)	
                        + COALESCE(returns_digital_services_fee, 0)	
                        + COALESCE(returns_fbm_shipping_commission, 0)	
                        + COALESCE(returns_marketplace_facilitator_tax_principal, 0)	
                        + COALESCE(returns_marketplace_facilitator_tax_shipping, 0)	
                        + COALESCE(statements_return_other, 0)	
                            + COALESCE(statements_other_allocated, 0)
                        + COALESCE(statements_non_sku_adjustments, 0)
                    else
                        COALESCE(item_price, 0)	
                        + COALESCE(shipping_price, 0)	
                        + COALESCE(gift_wrap_price, 0)	
                        + COALESCE(item_tax, 0)	
                        + COALESCE(shipping_tax, 0)	
                        + COALESCE(gift_wrap_tax, 0)
                end
            ) as total_revenue,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_shipping_chargeback, 0)
                        + COALESCE(statements_gift_wrap_chargeback, 0)
                        + COALESCE(statements_item_promotion_discount, 0)	
                        + COALESCE(statements_ship_promotion_discount, 0)	
                        + COALESCE(statements_promotion_deal_coupon_fees_allocated, 0)	
                        + COALESCE(statements_commission, 0)	
                        + COALESCE(statements_sponsored_products_charge_allocated, 0)	
                        + COALESCE(statements_sales_tax_service_fee, 0)	
                        + COALESCE(statements_digital_services_fee, 0)	
                        + COALESCE(statements_fba_fulfillment_fee, 0)
                        + COALESCE(fba_inbound_transportation_fee, 0)	
                        + COALESCE(statements_fba_storage_fee_allocated, 0)	
                        + COALESCE(statements_fbm_shipping_commission, 0)	
                        + COALESCE(statements_subscription_fee_allocated, 0)	
                        + COALESCE(statements_marketplace_facilitator_tax_principal, 0)	
                        + COALESCE(statements_marketplace_facilitator_tax_shipping, 0)	
                        + COALESCE(returns_shipping_price, 0)	
                        + COALESCE(returns_gift_wrap_price, 0)	
                        + COALESCE(returns_item_tax, 0)	
                        + COALESCE(returns_shipping_tax, 0)	
                        + COALESCE(returns_gift_wrap_tax, 0)		
                        + COALESCE(returns_refund_commission, 0)	
                    else
                        COALESCE(item_promotion_discount, 0)	
                        + COALESCE(ship_promotion_discount, 0)	
                        + COALESCE(commission, 0)	
                        + COALESCE(sponsored_products_charge, 0)	
                        + COALESCE(sales_tax_service_fee, 0)	
                        + COALESCE(marketplace_facilitator_tax_principal, 0)	
                        + COALESCE(marketplace_facilitator_tax_shipping, 0)
                        + COALESCE(digital_services_fee, 0)	
                        + COALESCE(fba_fulfillment_fee, 0)	
                        + COALESCE(fba_inbound_transportation_fee, 0)	
                        + COALESCE(fba_storage_fee, 0)	
                        + COALESCE(fbm_shipping_commission, 0)	
                        + COALESCE(subscription_fee, 0)	
                end
            ) as total_operating_expenses,
            sum(
                case when payment_status = 'Paid'
                    then 	
                        COALESCE(statements_commission, 0)		
                    else
                        COALESCE(commission, 0)	
                end
            ) as operating_expenses_commission,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_item_promotion_discount, 0)	
                        + COALESCE(statements_ship_promotion_discount, 0)	
                        + COALESCE(statements_promotion_deal_coupon_fees_allocated, 0)	
                    else
                        COALESCE(item_promotion_discount, 0)	
                        + COALESCE(ship_promotion_discount, 0)
                end
            ) as operating_expenses_promotions,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_sponsored_products_charge_allocated, 0)	
	
                    else
                        COALESCE(sponsored_products_charge, 0)	
                end
            ) as operating_expenses_advertisements,
            sum(
                case when payment_status = 'Paid'
                    then 
	                    COALESCE(statements_fba_fulfillment_fee, 0)
                        + COALESCE(fba_inbound_transportation_fee, 0)	
                        + COALESCE(statements_fba_storage_fee_allocated, 0)	
                    else
                        COALESCE(fba_fulfillment_fee, 0)	
                        + COALESCE(fba_inbound_transportation_fee, 0)	
                        + COALESCE(fba_storage_fee, 0)		
                end
            ) as operating_expenses_fba_fees,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_FBM_shipping_commission, 0)		
                    else
                        COALESCE(FBM_shipping_commission, 0)	
                end
            ) as operating_expenses_fbm_fees,
                        sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_sales_tax_service_fee, 0)	
                        + COALESCE(statements_digital_services_fee, 0)	
                        + COALESCE(statements_subscription_fee_allocated, 0)		
                    else
                        COALESCE(sales_tax_service_fee, 0)	
                        + COALESCE(digital_services_fee, 0)	
                        + COALESCE(subscription_fee, 0)	
                end
            ) as operating_expenses_service_fees,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_marketplace_facilitator_tax_principal, 0)	
                        + COALESCE(statements_marketplace_facilitator_tax_shipping, 0)		
                    else
                        COALESCE(marketplace_facilitator_tax_principal, 0)	
                        + COALESCE(marketplace_facilitator_tax_shipping, 0)	
                end
            ) as operating_expenses_marketplace_facilitator_tax,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_shipping_chargeback, 0)
                        + COALESCE(statements_gift_wrap_chargeback, 0)	
                end
            ) as operating_expenses_revenue_chargebacks,
            sum( 
                COALESCE(returns_shipping_price, 0)	
                + COALESCE(returns_gift_wrap_price, 0)	
                + COALESCE(returns_item_tax, 0)	
                + COALESCE(returns_shipping_tax, 0)	
                + COALESCE(returns_gift_wrap_tax, 0)		
                + COALESCE(returns_refund_commission, 0)	
            ) as operating_expenses_returns
    from allorderspnl
    where (datetime(purchase_date_pst_pdt) <= datetime(:as_of_date))
          or (purchase_date_pst_pdt is null and data_month_last_day <= :month_end)
    group by purchase_date_pst_pdt, data_month_last_day, sales_status, payment_status, amazon_order_id, sku
    )
    select 
        o.purchase_date_pst_pdt,
        o.data_month_last_day,
        o.sales_status,
        o.payment_status,
        o.amazon_order_id,
        o.sku,
        sum(COALESCE(total_revenue, 0)) as total_revenue,
        sum(COALESCE(total_operating_expenses, 0)) as total_operating_expenses,
        sum(COALESCE(operating_expenses_commission, 0)) as operating_expenses_commission,
        sum(COALESCE(operating_expenses_promotions, 0)) as operating_expenses_promotions,
        sum(COALESCE(operating_expenses_advertisements, 0)) as operating_expenses_advertisements,
        sum(COALESCE(operating_expenses_fba_fees, 0)) as operating_expenses_fba_fees,
        sum(COALESCE(operating_expenses_fbm_fees, 0)) as operating_expenses_fbm_fees,
        sum(COALESCE(operating_expenses_service_fees, 0)) as operating_expenses_service_fees,
        sum(COALESCE(operating_expenses_marketplace_facilitator_tax, 0)) as operating_expenses_marketplace_facilitator_tax,
        sum(COALESCE(operating_expenses_revenue_chargebacks, 0)) as operating_expenses_revenue_chargebacks,
        sum(COALESCE(operating_expenses_returns, 0)) as operating_expenses_returns,
        sum(COALESCE(shipping_cost, 0)) as shipping_cost
    from order_settlement_data as o
    left join (select order_id, sum(COALESCE(shipping_cost, 0)) as shipping_cost from fbmshippingcost group by order_id) as FBMShippingCost
    on o.amazon_order_id = FBMShippingCost.order_id
    group by o.purchase_date_pst_pdt, o.data_month_last_day, o.sales_status, o.payment_status, o.amazon_order_id, o.sku 
    """
    
    result = db.session.execute(
        text(query),
        {"as_of_date": as_of_date, "month_end": month_end}
    ).mappings().all()

    if not result:
        return pd.DataFrame(columns=[
            'purchase_date_pst_pdt', 'data_month_last_day', 'sales_status', 'payment_status', 'sku',
            'total_revenue', 'total_operating_expenses',
            'operating_expenses_commission',
            'operating_expenses_promotions', 'operating_expenses_advertisements',
            'operating_expenses_FBA_fees', 'operating_expenses_FBM_fees','operating_expenses_FBM_shipping',
            'operating_expenses_service_fees', 'operating_expenses_marketplace_facilitator_tax',
            'operating_expenses_revenue_chargebacks',
            'operating_expenses_returns'
        ])
    else:
        result = pd.DataFrame(result)
        result = result.rename(columns={'operating_expenses_fba_fees': 'operating_expenses_FBA_fees','operating_expenses_fbm_fees': 'operating_expenses_FBM_fees'})
        order_id_sku_count = result.groupby('amazon_order_id')['sku'].count()
        result['order_id_sku_count'] = result['amazon_order_id'].map(order_id_sku_count)
        result['operating_expenses_FBM_shipping'] = np.where(
            result['order_id_sku_count'] > 0,
            result['shipping_cost'] / result['order_id_sku_count'],
            0
        )
        result['total_operating_expenses'] = result['total_operating_expenses'] + result['shipping_cost']
        result = result.drop(columns=['order_id_sku_count', 'shipping_cost','amazon_order_id'])

        result['purchase_date_pst_pdt'] = result['purchase_date_pst_pdt'].fillna(pd.to_datetime('2099-12-31').date())
        result['sku'] = result['sku'].fillna('NonSKU_NonSKU_NonSKU')
        result = result.groupby(['purchase_date_pst_pdt', 'data_month_last_day', 'sales_status', 'payment_status', 'sku']).sum().reset_index()
        result['purchase_date_pst_pdt'] = result['purchase_date_pst_pdt'].replace(pd.to_datetime('2099-12-31').date(), pd.NaT)
        result['sku'] = result['sku'].replace('NonSKU_NonSKU_NonSKU', np.nan)

        desired_column_order = [
            'purchase_date_pst_pdt', 'data_month_last_day', 'sales_status', 'payment_status', 'sku',
            'total_revenue', 'total_operating_expenses',
            'operating_expenses_commission',
            'operating_expenses_promotions', 'operating_expenses_advertisements',
            'operating_expenses_FBA_fees', 'operating_expenses_FBM_fees', 'operating_expenses_FBM_shipping',
            'operating_expenses_service_fees', 'operating_expenses_marketplace_facilitator_tax',
            'operating_expenses_revenue_chargebacks',
            'operating_expenses_returns'
        ]

        # Reorder the DataFrame
        result = result[desired_column_order]


        return result

def get_operating_expenses_detailed_items_breakdown(as_of_date: datetime, period_display: str):
    
    # Determine the start date based on period display
    if period_display == 'month':
        month_start = datetime(as_of_date.year, as_of_date.month, 1)
        month_end_list = [datetime(
        as_of_date.year,
        as_of_date.month,
        monthrange(as_of_date.year, as_of_date.month)[1]
        ).date()]
    elif period_display == 'quarter':
        quarter_month = (as_of_date.month - 1) // 3 * 3 + 1
        month_start = datetime(as_of_date.year, quarter_month, 1)
        month_end_list = [d.to_pydatetime().date() for d in pd.date_range(
            start=month_start,
            end=as_of_date,
            freq='M'
        )]
    elif period_display == 'year':
        month_start = datetime(as_of_date.year, 1, 1)
        month_end_list = [d.to_pydatetime().date() for d in pd.date_range(
            start=month_start,
            end=as_of_date,
            freq='M'
        )]
    
    month_end_param_keys = [f"month_end_{i}" for i in range(len(month_end_list))]
    month_end_param_placeholders = ', '.join(f":{key}" for key in month_end_param_keys)
    month_end_params = {key: val for key, val in zip(month_end_param_keys, month_end_list)}

    query = """
    select 
            data_month_last_day,
            sales_status,
            sku,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_item_price, 0)
                        + COALESCE(statements_shipping_price, 0)
                        + COALESCE(statements_gift_wrap_price, 0)
                        + COALESCE(statements_item_tax, 0)
                        + COALESCE(statements_shipping_tax, 0)
                        + COALESCE(statements_gift_wrap_tax, 0)
                        + COALESCE(statements_order_other, 0)
                        + COALESCE(returns_shipping_chargeback, 0)
                        + COALESCE(returns_gift_wrap_chargeback, 0)
                        + COALESCE(returns_item_promotion_discount, 0)	
                        + COALESCE(returns_ship_promotion_discount, 0)	
                        + COALESCE(returns_commission, 0)	
                        + COALESCE(returns_digital_services_fee, 0)	
                        + COALESCE(returns_fbm_shipping_commission, 0)	
                        + COALESCE(returns_marketplace_facilitator_tax_principal, 0)	
                        + COALESCE(returns_marketplace_facilitator_tax_shipping, 0)	
                        + COALESCE(statements_return_other, 0)	
                            + COALESCE(statements_other_allocated, 0)
                        + COALESCE(statements_non_sku_adjustments, 0)
                    else
                        COALESCE(item_price, 0)	
                        + COALESCE(shipping_price, 0)	
                        + COALESCE(gift_wrap_price, 0)	
                        + COALESCE(item_tax, 0)	
                        + COALESCE(shipping_tax, 0)	
                        + COALESCE(gift_wrap_tax, 0)
                end
            ) as total_revenue,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_sponsored_products_charge_allocated, 0)	
	
                    else
                        COALESCE(sponsored_products_charge, 0)	
                end
            ) as operating_expenses_advertisements,
            sum(
                case when payment_status = 'Paid'
                    then 
	                    COALESCE(statements_fba_fulfillment_fee, 0)
                        + COALESCE(fba_inbound_transportation_fee, 0)	
                        + COALESCE(statements_fba_storage_fee_allocated, 0)	
                    else
                        COALESCE(fba_fulfillment_fee, 0)	
                        + COALESCE(fba_inbound_transportation_fee, 0)	
                        + COALESCE(fba_storage_fee, 0)		
                end
            ) as operating_expenses_fba_fees,
            sum(
                case when payment_status = 'Paid' 
                then 
	                    COALESCE(statements_fba_fulfillment_fee, 0)
                    else
                        COALESCE(fba_fulfillment_fee, 0)	
                end
            ) as fba_fulfillment_fee,
            sum(
                case when payment_status = 'Paid'
                    then 
	                    COALESCE(fba_inbound_transportation_fee, 0)		
                    else
                        COALESCE(fba_inbound_transportation_fee, 0)			
                end
            ) as fba_inbound_transportation_fee,
            sum(
                case when payment_status = 'Paid'
                    then 
	                    COALESCE(statements_fba_storage_fee_allocated, 0)	
                    else
                        COALESCE(fba_storage_fee, 0)		
                end
            ) as fba_storage_fee,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_sales_tax_service_fee, 0)	
                        + COALESCE(statements_digital_services_fee, 0)	
                        + COALESCE(statements_subscription_fee_allocated, 0)		
                    else
                        COALESCE(sales_tax_service_fee, 0)	
                        + COALESCE(digital_services_fee, 0)	
                        + COALESCE(subscription_fee, 0)	
                end
            ) as operating_expenses_service_fees,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_sales_tax_service_fee, 0)	
                    else
                        COALESCE(sales_tax_service_fee, 0)
                end
            ) as sales_tax_service_fee,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_digital_services_fee, 0)		
                    else
                        COALESCE(digital_services_fee, 0)	
                end
            ) as digital_services_fee,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_subscription_fee_allocated, 0)		
                    else
                        COALESCE(subscription_fee, 0)	
                end
            ) as subscription_fee,
            sum( 
                COALESCE(returns_shipping_price, 0)	
                + COALESCE(returns_gift_wrap_price, 0)	
                + COALESCE(returns_item_tax, 0)	
                + COALESCE(returns_shipping_tax, 0)	
                + COALESCE(returns_gift_wrap_tax, 0)		
                + COALESCE(returns_refund_commission, 0)	
            ) as operating_expenses_returns,
            sum( 
                COALESCE(returns_shipping_price, 0)	
                + COALESCE(returns_gift_wrap_price, 0)	
            ) as returns_shipping_gift_wrap,
            sum( 
                COALESCE(returns_item_tax, 0)	
                + COALESCE(returns_shipping_tax, 0)	
                + COALESCE(returns_gift_wrap_tax, 0)			
            ) as returns_tax,
            sum( 
                COALESCE(returns_refund_commission, 0)	
            ) as returns_refund_commission
    from allorderspnl
    where (CAST(purchase_date_pst_pdt AS timestamp) <= CAST(:as_of_date AS timestamp) and CAST(purchase_date_pst_pdt AS timestamp) >= CAST(:month_start AS timestamp))
        or (purchase_date_pst_pdt is null and data_month_last_day IN ({month_end_param_placeholders}))
    group by data_month_last_day, sales_status, sku
    """
    
    query_params = {
        "as_of_date": as_of_date,
        "month_start": month_start,
        **month_end_params
    }
    result = db.session.execute(
        text(query.format(month_end_param_placeholders=month_end_param_placeholders)),
        query_params
    ).mappings().all()

    if not result:
        return pd.DataFrame(columns=[
            'data_month_last_day', 'sales_status', 'sku',
            'total_revenue', 
            'operating_expenses_advertisements',
            'operating_expenses_FBA_fees', 'FBA_fulfillment_fee','FBA_inbound_transportation_fee', 'FBA_storage_fee',
            'operating_expenses_service_fees', 'sales_tax_service_fee', 'digital_services_fee', 'subscription_fee',
            'operating_expenses_returns', 'returns_shipping_gift_wrap', 'returns_tax', 'returns_refund_commission'
        ])
    else:
        result = pd.DataFrame(result)
        result = result.rename(columns={'operating_expenses_fba_fees': 'operating_expenses_FBA_fees','fba_fulfillment_fee': 'FBA_fulfillment_fee','fba_inbound_transportation_fee': 'FBA_inbound_transportation_fee','fba_storage_fee': 'FBA_storage_fee'})
        result['sku'] = result['sku'].fillna('NonSKU_NonSKU_NonSKU')
        result = result.groupby(['data_month_last_day', 'sales_status', 'sku']).sum().reset_index()
        result['sku'] = result['sku'].replace('NonSKU_NonSKU_NonSKU', np.nan)

        desired_column_order = [
            'data_month_last_day', 'sales_status', 'sku',
            'total_revenue', 
            'operating_expenses_advertisements',
            'operating_expenses_FBA_fees', 'FBA_fulfillment_fee','FBA_inbound_transportation_fee', 'FBA_storage_fee',
            'operating_expenses_service_fees', 'sales_tax_service_fee', 'digital_services_fee', 'subscription_fee',
            'operating_expenses_returns', 'returns_shipping_gift_wrap', 'returns_tax', 'returns_refund_commission'
        ]

        # Reorder the DataFrame
        result = result[desired_column_order]

        return result

def get_operating_expenses_detailed_items_breakdown_since_beginning(as_of_date: datetime):

    # Determine end date for no sales time
    month_end = datetime(as_of_date.year, as_of_date.month, monthrange(as_of_date.year, as_of_date.month)[1]).date()

    query = """
    with order_settlement_data as (
    select 
            data_month_last_day,
            sales_status,
            amazon_order_id,
            sku,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_item_price, 0)
                        + COALESCE(statements_shipping_price, 0)
                        + COALESCE(statements_gift_wrap_price, 0)
                        + COALESCE(statements_item_tax, 0)
                        + COALESCE(statements_shipping_tax, 0)
                        + COALESCE(statements_gift_wrap_tax, 0)
                        + COALESCE(statements_order_other, 0)
                        + COALESCE(returns_shipping_chargeback, 0)
                        + COALESCE(returns_gift_wrap_chargeback, 0)
                        + COALESCE(returns_item_promotion_discount, 0)	
                        + COALESCE(returns_ship_promotion_discount, 0)	
                        + COALESCE(returns_commission, 0)	
                        + COALESCE(returns_digital_services_fee, 0)	
                        + COALESCE(returns_fbm_shipping_commission, 0)	
                        + COALESCE(returns_marketplace_facilitator_tax_principal, 0)	
                        + COALESCE(returns_marketplace_facilitator_tax_shipping, 0)	
                        + COALESCE(statements_return_other, 0)	
                            + COALESCE(statements_other_allocated, 0)
                        + COALESCE(statements_non_sku_adjustments, 0)
                    else
                        COALESCE(item_price, 0)	
                        + COALESCE(shipping_price, 0)	
                        + COALESCE(gift_wrap_price, 0)	
                        + COALESCE(item_tax, 0)	
                        + COALESCE(shipping_tax, 0)	
                        + COALESCE(gift_wrap_tax, 0)
                end
            ) as total_revenue,
            sum(
                case when payment_status = 'Paid'
                    then 	
                        COALESCE(statements_commission, 0)		
                    else
                        COALESCE(commission, 0)	
                end
            ) as operating_expenses_commission,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_item_promotion_discount, 0)	
                        + COALESCE(statements_ship_promotion_discount, 0)	
                        + COALESCE(statements_promotion_deal_coupon_fees_allocated, 0)	
                    else
                        COALESCE(item_promotion_discount, 0)	
                        + COALESCE(ship_promotion_discount, 0)
                end
            ) as operating_expenses_promotions,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_sponsored_products_charge_allocated, 0)	
	
                    else
                        COALESCE(sponsored_products_charge, 0)	
                end
            ) as operating_expenses_advertisements,
            sum(
                case when payment_status = 'Paid'
                    then 
	                    COALESCE(statements_fba_fulfillment_fee, 0)
                        + COALESCE(fba_inbound_transportation_fee, 0)	
                        + COALESCE(statements_fba_storage_fee_allocated, 0)	
                    else
                        COALESCE(fba_fulfillment_fee, 0)	
                        + COALESCE(fba_inbound_transportation_fee, 0)	
                        + COALESCE(fba_storage_fee, 0)		
                end
            ) as operating_expenses_fba_fees,
            sum(
                case when payment_status = 'Paid' 
                then 
	                    COALESCE(statements_fba_fulfillment_fee, 0)
                    else
                        COALESCE(fba_fulfillment_fee, 0)	
                end
            ) as fba_fulfillment_fee,
            sum(
                case when payment_status = 'Paid'
                    then 
	                    COALESCE(fba_inbound_transportation_fee, 0)		
                    else
                        COALESCE(fba_inbound_transportation_fee, 0)			
                end
            ) as fba_inbound_transportation_fee,
            sum(
                case when payment_status = 'Paid'
                    then 
	                    COALESCE(statements_fba_storage_fee_allocated, 0)	
                    else
                        COALESCE(fba_storage_fee, 0)		
                end
            ) as fba_storage_fee,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_fbm_shipping_commission, 0)		
                    else
                        COALESCE(fbm_shipping_commission, 0)	
                end
            ) as operating_expenses_fbm_fees,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_sales_tax_service_fee, 0)	
                        + COALESCE(statements_digital_services_fee, 0)	
                        + COALESCE(statements_subscription_fee_allocated, 0)		
                    else
                        COALESCE(sales_tax_service_fee, 0)	
                        + COALESCE(digital_services_fee, 0)	
                        + COALESCE(subscription_fee, 0)	
                end
            ) as operating_expenses_service_fees,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_sales_tax_service_fee, 0)	
                    else
                        COALESCE(sales_tax_service_fee, 0)
                end
            ) as sales_tax_service_fee,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_digital_services_fee, 0)		
                    else
                        COALESCE(digital_services_fee, 0)	
                end
            ) as digital_services_fee,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_subscription_fee_allocated, 0)		
                    else
                        COALESCE(subscription_fee, 0)	
                end
            ) as subscription_fee,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_marketplace_facilitator_tax_principal, 0)	
                        + COALESCE(statements_marketplace_facilitator_tax_shipping, 0)		
                    else
                        COALESCE(marketplace_facilitator_tax_principal, 0)	
                        + COALESCE(marketplace_facilitator_tax_shipping, 0)	
                end
            ) as operating_expenses_marketplace_facilitator_tax,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_shipping_chargeback, 0)
                        + COALESCE(statements_gift_wrap_chargeback, 0)	
                end
            ) as operating_expenses_revenue_chargebacks,
            sum( 
                COALESCE(returns_shipping_price, 0)	
                + COALESCE(returns_gift_wrap_price, 0)	
                + COALESCE(returns_item_tax, 0)	
                + COALESCE(returns_shipping_tax, 0)	
                + COALESCE(returns_gift_wrap_tax, 0)		
                + COALESCE(returns_refund_commission, 0)	
            ) as operating_expenses_returns,
            sum( 
                COALESCE(returns_shipping_price, 0)	
                + COALESCE(returns_gift_wrap_price, 0)	
            ) as returns_shipping_gift_wrap,
            sum( 
                COALESCE(returns_item_tax, 0)	
                + COALESCE(returns_shipping_tax, 0)	
                + COALESCE(returns_gift_wrap_tax, 0)			
            ) as returns_tax,
            sum( 
                COALESCE(returns_refund_commission, 0)	
            ) as returns_refund_commission
    from allorderspnl
    where (datetime(purchase_date_pst_pdt) <= datetime(:as_of_date))
          or (purchase_date_pst_pdt is null and data_month_last_day <= :month_end)
    group by data_month_last_day, sales_status, amazon_order_id, sku
    )
    select 
        o.data_month_last_day, 
        o.sales_status, 
        o.amazon_order_id, 
        o.sku,
        sum(COALESCE(total_revenue, 0)) as total_revenue,
        sum(COALESCE(operating_expenses_commission, 0)) as operating_expenses_commission,
        sum(COALESCE(operating_expenses_promotions, 0)) as operating_expenses_promotions,
        sum(COALESCE(operating_expenses_advertisements, 0)) as operating_expenses_advertisements,

        sum(COALESCE(operating_expenses_fba_fees, 0)) as operating_expenses_fba_fees,
        sum(COALESCE(fba_fulfillment_fee, 0)) as fba_fulfillment_fee,
        sum(COALESCE(fba_inbound_transportation_fee, 0)) as fba_inbound_transportation_fee,
        sum(COALESCE(fba_storage_fee, 0)) as fba_storage_fee,

        sum(COALESCE(operating_expenses_fbm_fees, 0)) as operating_expenses_fbm_fees,
        
        sum(COALESCE(operating_expenses_service_fees, 0)) as operating_expenses_service_fees,
        sum(COALESCE(sales_tax_service_fee, 0)) as sales_tax_service_fee,
        sum(COALESCE(digital_services_fee, 0)) as digital_services_fee,
        sum(COALESCE(subscription_fee, 0)) as subscription_fee,

        sum(COALESCE(operating_expenses_marketplace_facilitator_tax, 0)) as operating_expenses_marketplace_facilitator_tax,
        sum(COALESCE(operating_expenses_revenue_chargebacks, 0)) as operating_expenses_revenue_chargebacks,

        sum(COALESCE(operating_expenses_returns, 0)) as operating_expenses_returns,
        sum(COALESCE(returns_shipping_gift_wrap, 0)) as returns_shipping_gift_wrap,
        sum(COALESCE(returns_tax, 0)) as returns_tax,
        sum(COALESCE(returns_refund_commission, 0)) as returns_refund_commission,

        sum(COALESCE(shipping_cost, 0)) as shipping_cost
    from order_settlement_data o
    left join (select order_id, sum(COALESCE(shipping_cost, 0)) as shipping_cost from fbmshippingcost group by order_id) as fbmshippingCost
    on o.amazon_order_id = FBMShippingCost.order_id
    group by o.data_month_last_day, o.sales_status, o.amazon_order_id, o.sku 
    """
    
    result = db.session.execute(
        text(query),
        {"as_of_date": as_of_date, "month_end": month_end}
    ).mappings().all()

    if not result:
        return pd.DataFrame(columns=[
            'data_month_last_day', 'sales_status', 'sku',
            'total_revenue', 
            'operating_expenses_commission',
            'operating_expenses_advertisements',
            'operating_expenses_promotions',
            'operating_expenses_FBA_fees', 'FBA_fulfillment_fee','FBA_inbound_transportation_fee', 'FBA_storage_fee',
            'operating_expenses_FBM_fees',
            'operating_expenses_FBM_shipping',
            'operating_expenses_service_fees', 'sales_tax_service_fee', 'digital_services_fee', 'subscription_fee',
            'operating_expenses_marketplace_facilitator_tax',
            'operating_expenses_revenue_chargebacks',
            'operating_expenses_returns', 'returns_shipping_gift_wrap', 'returns_tax', 'returns_refund_commission'
        ])
    else:
        result = pd.DataFrame(result)
        result = result.rename(columns={'operating_expenses_fba_fees': 'operating_expenses_FBA_fees','fba_fulfillment_fee': 'FBA_fulfillment_fee','fba_inbound_transportation_fee': 'FBA_inbound_transportation_fee','fba_storage_fee': 'FBA_storage_fee','operating_expenses_fbm_fees': 'operating_expenses_FBM_fees'})
        order_id_sku_count = result.groupby('amazon_order_id')['sku'].count()
        result['order_id_sku_count'] = result['amazon_order_id'].map(order_id_sku_count)
        result['operating_expenses_FBM_shipping'] = np.where(
            result['order_id_sku_count'] > 0,
            result['shipping_cost'] / result['order_id_sku_count'],
            0
        )
        result = result.drop(columns=['order_id_sku_count', 'shipping_cost','amazon_order_id'])
        result['sku'] = result['sku'].fillna('NonSKU_NonSKU_NonSKU')
        result = result.groupby(['data_month_last_day', 'sales_status', 'sku']).sum().reset_index()
        result['sku'] = result['sku'].replace('NonSKU_NonSKU_NonSKU', np.nan)

        desired_column_order = [
            'data_month_last_day', 'sales_status', 'sku',
            'total_revenue', 
            'operating_expenses_commission',
            'operating_expenses_advertisements',
            'operating_expenses_promotions',
            'operating_expenses_FBA_fees', 'FBA_fulfillment_fee','FBA_inbound_transportation_fee', 'FBA_storage_fee',
            'operating_expenses_FBM_fees',
            'operating_expenses_FBM_shipping',
            'operating_expenses_service_fees', 'sales_tax_service_fee', 'digital_services_fee', 'subscription_fee',
            'operating_expenses_marketplace_facilitator_tax',
            'operating_expenses_revenue_chargebacks',
            'operating_expenses_returns', 'returns_shipping_gift_wrap', 'returns_tax', 'returns_refund_commission'
        ]

        # Reorder the DataFrame
        result = result[desired_column_order]

        return result

def get_pnl_report_by_day():

    query = """
    with order_settlement_data as (
    select 
            COALESCE(purchase_date_pst_pdt, non_order_posted_date_pst_pdt) AS date_by_day,
            amazon_order_id,
            sku,
            sum(COALESCE(quantity, 0)) as quantity,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_item_price, 0)
                        + COALESCE(statements_shipping_price, 0)
                        + COALESCE(statements_gift_wrap_price, 0)
                        + COALESCE(statements_item_tax, 0)
                        + COALESCE(statements_shipping_tax, 0)
                        + COALESCE(statements_gift_wrap_tax, 0)
                        + COALESCE(returns_shipping_chargeback, 0)
                        + COALESCE(returns_gift_wrap_chargeback, 0)
                        + COALESCE(returns_item_promotion_discount, 0)	
                        + COALESCE(returns_ship_promotion_discount, 0)	
                        + COALESCE(returns_commission, 0)	
                        + COALESCE(returns_digital_services_fee, 0)	
                        + COALESCE(returns_fbm_shipping_commission, 0)	
                        + COALESCE(returns_marketplace_facilitator_tax_principal, 0)	
                        + COALESCE(returns_marketplace_facilitator_tax_shipping, 0)	
                        + COALESCE(statements_return_other, 0)	
                        + COALESCE(statements_other_allocated, 0)
                        + COALESCE(statements_non_sku_adjustments, 0)
                    else
                        COALESCE(item_price, 0)	
                        + COALESCE(shipping_price, 0)	
                        + COALESCE(gift_wrap_price, 0)	
                        + COALESCE(item_tax, 0)	
                        + COALESCE(shipping_tax, 0)	
                        + COALESCE(gift_wrap_tax, 0)
                end
            ) as total_revenue,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_item_price, 0)
                    else
                        COALESCE(item_price, 0)	
                end
            ) as revenue_principal,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_shipping_price, 0)
                    else
                        COALESCE(shipping_price, 0)	
                end
            ) as revenue_shipping,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_item_tax, 0)
                        + COALESCE(statements_shipping_tax, 0)
                        + COALESCE(statements_gift_wrap_tax, 0)
                    else	
                        COALESCE(item_tax, 0)	
                        + COALESCE(shipping_tax, 0)	
                        + COALESCE(gift_wrap_tax, 0)
                end
            ) as revenue_tax,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(returns_shipping_chargeback, 0)
                        + COALESCE(returns_gift_wrap_chargeback, 0)
                        + COALESCE(returns_item_promotion_discount, 0)	
                        + COALESCE(returns_ship_promotion_discount, 0)	
                        + COALESCE(returns_commission, 0)	
                        + COALESCE(returns_digital_services_fee, 0)	
                        + COALESCE(returns_fbm_shipping_commission, 0)	
                        + COALESCE(returns_marketplace_facilitator_tax_principal, 0)	
                        + COALESCE(returns_marketplace_facilitator_tax_shipping, 0)	
                        + COALESCE(statements_return_other, 0)	
                end
            ) as revenue_returns,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_other_allocated, 0)
                        + COALESCE(statements_non_sku_adjustments, 0)
                        + COALESCE(statements_gift_wrap_price, 0)
                else
                    COALESCE(gift_wrap_price, 0)
                end
            ) as revenue_other,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_shipping_chargeback, 0)
                        + COALESCE(statements_gift_wrap_chargeback, 0)
                        + COALESCE(statements_item_promotion_discount, 0)	
                        + COALESCE(statements_ship_promotion_discount, 0)	
                        + COALESCE(statements_promotion_deal_coupon_fees_allocated, 0)	
                        + COALESCE(statements_commission, 0)	
                        + COALESCE(statements_sponsored_products_charge_allocated, 0)	
                        + COALESCE(statements_sales_tax_service_fee, 0)	
                        + COALESCE(statements_digital_services_fee, 0)	
                        + COALESCE(statements_fba_fulfillment_fee, 0)
                        + COALESCE(fba_inbound_transportation_fee, 0)	
                        + COALESCE(statements_fba_storage_fee_allocated, 0)	
                        + COALESCE(statements_fbm_shipping_commission, 0)	
                        + COALESCE(statements_order_other, 0)
                        + COALESCE(statements_subscription_fee_allocated, 0)	
                        + COALESCE(statements_marketplace_facilitator_tax_principal, 0)	
                        + COALESCE(statements_marketplace_facilitator_tax_shipping, 0)	
                        + COALESCE(returns_shipping_price, 0)	
                        + COALESCE(returns_gift_wrap_price, 0)	
                        + COALESCE(returns_item_tax, 0)	
                        + COALESCE(returns_shipping_tax, 0)	
                        + COALESCE(returns_gift_wrap_tax, 0)		
                        + COALESCE(returns_refund_commission, 0)	
                    else
                        COALESCE(item_promotion_discount, 0)	
                        + COALESCE(ship_promotion_discount, 0)	
                        + COALESCE(commission, 0)	
                        + COALESCE(sponsored_products_charge, 0)	
                        + COALESCE(sales_tax_service_fee, 0)	
                        + COALESCE(marketplace_facilitator_tax_principal, 0)	
                        + COALESCE(marketplace_facilitator_tax_shipping, 0)
                        + COALESCE(digital_services_fee, 0)	
                        + COALESCE(fba_fulfillment_fee, 0)	
                        + COALESCE(fba_inbound_transportation_fee, 0)	
                        + COALESCE(fba_storage_fee, 0)	
                        + COALESCE(fbm_shipping_commission, 0)	
                        + COALESCE(subscription_fee, 0)	
                end
            ) as total_operating_expenses,
            sum(
                case when payment_status = 'Paid'
                    then 	
                        COALESCE(statements_commission, 0)		
                        + COALESCE(statements_fbm_shipping_commission, 0)
                    else
                        COALESCE(commission, 0)	
                        + COALESCE(fbm_shipping_commission, 0)
                end
            ) as operating_expenses_commission,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_item_promotion_discount, 0)	
                        + COALESCE(statements_ship_promotion_discount, 0)	
                        + COALESCE(statements_promotion_deal_coupon_fees_allocated, 0)	
                    else
                        COALESCE(item_promotion_discount, 0)	
                        + COALESCE(ship_promotion_discount, 0)
                end
            ) as operating_expenses_promotions,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_sponsored_products_charge_allocated, 0)	
	
                    else
                        COALESCE(sponsored_products_charge, 0)	
                end
            ) as operating_expenses_advertisements,
            sum(
                case when payment_status = 'Paid'
                    then 
	                    COALESCE(statements_fba_fulfillment_fee, 0)
                        + COALESCE(fba_inbound_transportation_fee, 0)	
                        + COALESCE(statements_fba_storage_fee_allocated, 0)	
                    else
                        COALESCE(fba_fulfillment_fee, 0)	
                        + COALESCE(fba_inbound_transportation_fee, 0)	
                        + COALESCE(fba_storage_fee, 0)		
                end
            ) as operating_expenses_fba_fees,
            sum(
                case when payment_status = 'Paid' 
                then 
	                    COALESCE(statements_fba_fulfillment_fee, 0)
                    else
                        COALESCE(fba_fulfillment_fee, 0)	
                end
            ) as fba_fulfillment_fee,
            sum(
                case when payment_status = 'Paid'
                    then 
	                    COALESCE(statements_fba_storage_fee_allocated, 0)	
                    else
                        COALESCE(fba_storage_fee, 0)		
                end
            ) as fba_storage_fee,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_sales_tax_service_fee, 0)	
                        + COALESCE(statements_digital_services_fee, 0)	
                        + COALESCE(statements_subscription_fee_allocated, 0)		
                        + COALESCE(statements_order_other, 0)
                    else
                        COALESCE(sales_tax_service_fee, 0)	
                        + COALESCE(digital_services_fee, 0)	
                        + COALESCE(subscription_fee, 0)	
                end
            ) as operating_expenses_service_fees,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_marketplace_facilitator_tax_principal, 0)	
                        + COALESCE(statements_marketplace_facilitator_tax_shipping, 0)		
                    else
                        COALESCE(marketplace_facilitator_tax_principal, 0)	
                        + COALESCE(marketplace_facilitator_tax_shipping, 0)	
                end
            ) as operating_expenses_marketplace_facilitator_tax,
            sum(
                case when payment_status = 'Paid'
                    then 
                        COALESCE(statements_shipping_chargeback, 0)
                        + COALESCE(statements_gift_wrap_chargeback, 0)	
                end
            ) as operating_expenses_revenue_chargebacks,
            sum( 
                COALESCE(returns_shipping_price, 0)	
                + COALESCE(returns_gift_wrap_price, 0)	
                + COALESCE(returns_item_tax, 0)	
                + COALESCE(returns_shipping_tax, 0)	
                + COALESCE(returns_gift_wrap_tax, 0)		
                + COALESCE(returns_refund_commission, 0)	
            ) as operating_expenses_returns,
            sum( 
                COALESCE(returns_shipping_price, 0)	
                + COALESCE(returns_gift_wrap_price, 0)	
            ) as returns_shipping_gift_wrap,
            sum( 
                COALESCE(returns_item_tax, 0)	
                + COALESCE(returns_shipping_tax, 0)	
                + COALESCE(returns_gift_wrap_tax, 0)			
            ) as returns_tax,
            sum( 
                COALESCE(returns_refund_commission, 0)	
            ) as returns_refund_commission
    from allorderspnl
    group by COALESCE(purchase_date_pst_pdt, non_order_posted_date_pst_pdt), amazon_order_id, sku
    )
    select 
        o.date_by_day, 
        o.amazon_order_id,
        o.sku,
        sum(COALESCE(quantity, 0)) as quantity,
        sum(COALESCE(total_revenue, 0)) as total_revenue,
        sum(COALESCE(revenue_principal, 0)) as revenue_principal,
        sum(COALESCE(revenue_shipping, 0)) as revenue_shipping,
        sum(COALESCE(revenue_tax, 0)) as revenue_tax,
        sum(COALESCE(revenue_returns, 0)) as revenue_returns,
        sum(COALESCE(revenue_other, 0)) as revenue_other,

        sum(COALESCE(cogs, 0)) as total_cogs,

        sum(COALESCE(total_operating_expenses, 0)) as total_operating_expenses,

        sum(COALESCE(operating_expenses_commission, 0)) as operating_expenses_commission,
        sum(COALESCE(operating_expenses_advertisements, 0)) as operating_expenses_advertisements,
        sum(COALESCE(operating_expenses_promotions, 0)) as operating_expenses_promotions,

        sum(shipping_cost) as operating_expenses_fbm_shipping_cost,
        sum(warehouse_cost) as operating_expenses_fbm_warehouse_cost,

        sum(COALESCE(operating_expenses_fba_fees, 0)) as operating_expenses_fba_fees,
        sum(COALESCE(fba_fulfillment_fee, 0)) as fba_fulfillment_fee,
        sum(COALESCE(fba_storage_fee, 0)) as fba_storage_fee,

        sum(COALESCE(operating_expenses_service_fees, 0)) as operating_expenses_service_fees,
        sum(COALESCE(operating_expenses_marketplace_facilitator_tax, 0)) as operating_expenses_marketplace_facilitator_tax,
        sum(COALESCE(operating_expenses_revenue_chargebacks, 0)) as operating_expenses_revenue_chargebacks,

        sum(COALESCE(operating_expenses_returns, 0)) as operating_expenses_returns,
        sum(COALESCE(returns_shipping_gift_wrap, 0)) as returns_shipping_gift_wrap,
        sum(COALESCE(returns_tax, 0)) as returns_tax,
        sum(COALESCE(returns_refund_commission, 0)) as returns_refund_commission

        
    from order_settlement_data o
    left join (select sales_record_id, sku, sum(COALESCE(cogs, 0)) as cogs from cogs group by sales_record_id, sku) as cogs_table
    on o.amazon_order_id = cogs_table.sales_record_id and lower(o.sku) = lower(cogs_table.sku)
    left join (select order_id, sum(COALESCE(shipping_cost, 0)) as shipping_cost, sum(COALESCE(warehouse_cost, 0)) as warehouse_cost from fbmshippingcost group by order_id) as fbmshippingcost
    on o.amazon_order_id = fbmshippingcost.order_id
    group by o.date_by_day, o.amazon_order_id, o.sku 
    """
    
    result = db.session.execute(
        text(query),
    ).mappings().all()

    if not result:
        return pd.DataFrame(columns=[
            'date_by_day', 'sku', 'quantity',
            'total_revenue', 'revenue_principal', 'revenue_shipping', 'revenue_tax', 'revenue_returns', 'revenue_other',
            
            'total_COGS',
            'gross_margin',

            'total_operating_expenses',
            'operating_expenses_commission',
            'operating_expenses_advertisements',
            'operating_expenses_promotions',
            'operating_expenses_FBM_shipping_cost',
            'operating_expenses_FBM_warehouse_cost',
            'operating_expenses_FBA_fees', 'FBA_fulfillment_fee', 'FBA_storage_fee',
            'operating_expenses_service_fees', 
            'operating_expenses_marketplace_facilitator_tax',
            'operating_expenses_revenue_chargebacks',
            'operating_expenses_returns', 'returns_shipping_gift_wrap', 'returns_tax', 'returns_refund_commission',

            'net_profit'
        ])
    else:
        result = pd.DataFrame(result)
        result = result.rename(columns={'operating_expenses_fba_fees': 'operating_expenses_FBA_fees','fba_fulfillment_fee': 'FBA_fulfillment_fee','fba_storage_fee': 'FBA_storage_fee','operating_expenses_fbm_shipping_cost': 'operating_expenses_FBM_shipping_cost','operating_expenses_fbm_warehouse_cost': 'operating_expenses_FBM_warehouse_cost','total_cogs': 'total_COGS'})

        order_id_sku_count = result[~result['sku'].str.contains('FBA', case=False, na=False)].groupby('amazon_order_id')['sku'].count()
        result['order_id_sku_count'] = result['amazon_order_id'].map(order_id_sku_count)
        result['operating_expenses_FBM_shipping_cost'] = np.where(
            (result['operating_expenses_FBM_shipping_cost'].isna() & ~result['sku'].str.contains('FBA', case=False, na=True)),
            -9.4,
            result['operating_expenses_FBM_shipping_cost']
        )
        result['operating_expenses_FBM_warehouse_cost'] = np.where(
            (result['operating_expenses_FBM_warehouse_cost'].isna()& ~result['sku'].str.contains('FBA', case=False, na=True)),
            -2.9,
            result['operating_expenses_FBM_warehouse_cost']
        )
        result['operating_expenses_FBM_shipping_cost'] = np.where(
            result['order_id_sku_count'] > 0,
            result['operating_expenses_FBM_shipping_cost'].astype(float) / result['order_id_sku_count'].astype(float),
            0
        )
        result['operating_expenses_FBM_warehouse_cost'] = np.where(
            result['order_id_sku_count'] > 0,
            result['operating_expenses_FBM_warehouse_cost'].astype(float) / result['order_id_sku_count'].astype(float),
            0
        )

        result['total_operating_expenses'] = result['total_operating_expenses'].astype(float) + result['operating_expenses_FBM_shipping_cost'].astype(float) + result['operating_expenses_FBM_warehouse_cost'].astype(float)
        result = result.drop(columns=['order_id_sku_count','amazon_order_id'])

        result['date_by_day'] = pd.to_datetime(result['date_by_day']).dt.date
        
        result['sku'] = result['sku'].fillna('NonSKU_NonSKU_NonSKU')
        result = result.groupby(['date_by_day', 'sku']).sum().reset_index()
        result['sku'] = result['sku'].replace('NonSKU_NonSKU_NonSKU', np.nan)

        # target_date = [date(2025, 7, 26),
        #                date(2025, 7, 22),date(2025, 7, 23),date(2025, 7, 24),date(2025, 7, 25)
        #                ]
        # result = result[result['date_by_day'].isin(target_date)]
        # result = result[
        #     (result['date_by_day'] >= date(2025, 5, 4))
            #   &
            # (result['date_by_day'] <= date(2025, 8, 16))
        # ]
        # sku_use = [
        #     # 'IPA-US-01','IPA-US-01_A1_QD-TM08-37YW'
        #         #    'IPA-US-04','IPA-US-04_A'
        #            ]
        # result = result[result['sku'].isin(sku_use)]
        # result = result[result['sku'].str.contains('Vinegar', na=False)]


        result['total_COGS'] = result['total_COGS'].astype(float) * -1
        result['gross_margin'] = result['total_revenue'].astype(float) + result['total_COGS'].astype(float)
        result['net_profit'] = result['gross_margin'].astype(float) + result['total_operating_expenses'].astype(float)

        desired_column_order = [
            'date_by_day', 'sku', 'quantity',
            'total_revenue', 'revenue_principal', 'revenue_shipping', 'revenue_tax', 'revenue_returns', 'revenue_other',
            
            'total_COGS',
            'gross_margin',

            'total_operating_expenses',
            'operating_expenses_commission',
            'operating_expenses_advertisements',
            'operating_expenses_promotions',
            'operating_expenses_FBM_shipping_cost',
            'operating_expenses_FBM_warehouse_cost',
            'operating_expenses_FBA_fees', 'FBA_fulfillment_fee', 'FBA_storage_fee',
            'operating_expenses_service_fees', 
            'operating_expenses_marketplace_facilitator_tax',
            'operating_expenses_revenue_chargebacks',
            'operating_expenses_returns', 'returns_shipping_gift_wrap', 'returns_tax', 'returns_refund_commission',

            'net_profit'
        ]

        # Reorder the DataFrame
        result = result[desired_column_order]

        # result.to_csv('result.csv', index=False)

        return result

def get_profitability_report_by_week_and_sku():
    raw_data = get_pnl_report_by_day()

    # Convert all numeric columns from decimal to float FIRST
    expected_numeric_cols = [
        'quantity', 'total_revenue', 'revenue_principal', 'revenue_shipping', 'revenue_tax', 
        'revenue_returns', 'revenue_other', 'total_COGS', 'gross_margin', 'total_operating_expenses',
        'operating_expenses_commission', 'operating_expenses_advertisements', 'operating_expenses_promotions',
        'operating_expenses_FBM_shipping_cost', 'operating_expenses_FBM_warehouse_cost',
        'operating_expenses_FBA_fees', 'FBA_fulfillment_fee', 'FBA_storage_fee',
        'operating_expenses_service_fees', 'operating_expenses_marketplace_facilitator_tax',
        'operating_expenses_revenue_chargebacks', 'operating_expenses_returns',
        'returns_shipping_gift_wrap', 'returns_tax', 'returns_refund_commission', 'net_profit'
    ]
    
    # Convert existing columns to float
    for col in expected_numeric_cols:
        if col in raw_data.columns:
            raw_data[col] = pd.to_numeric(raw_data[col], errors='coerce').astype(float)

    raw_data.drop(columns=['FBA_fulfillment_fee', 'FBA_storage_fee', 'returns_shipping_gift_wrap', 'returns_tax', 'returns_refund_commission'], inplace=True)
    raw_data['operating_expenses_FBA_and_service_fees'] = raw_data['operating_expenses_FBA_fees'].astype(float) + raw_data['operating_expenses_service_fees'].astype(float)
    raw_data['operating_expenses_FBM_shipping_and_almost_0_revenue_chargebacks'] = raw_data['operating_expenses_FBM_shipping_cost'].astype(float) + raw_data['operating_expenses_revenue_chargebacks'].astype(float)
    raw_data.drop(columns=['operating_expenses_FBA_fees', 'operating_expenses_service_fees', 'operating_expenses_FBM_shipping_cost', 'operating_expenses_revenue_chargebacks'], inplace=True)

    # Convert date_by_day to datetime to ensure we can manipulate it
    raw_data['date_by_day'] = pd.to_datetime(raw_data['date_by_day'])
    # Create week start and end dates
    # For Sunday start (weekday 6)
    raw_data['week_start'] = raw_data['date_by_day'].apply(
        lambda x: x - pd.Timedelta(days=(x.weekday() + 1) % 7))
    raw_data['week_end'] = raw_data['week_start'] + pd.Timedelta(days=6)
    # # Ensure the week_start doesn't exceed the actual start and end date in the dataset
    # min_date = raw_data['date_by_day'].min()
    # max_date = raw_data['date_by_day'].max()
    # raw_data['week_start'] = raw_data['week_start'].apply(lambda x: max(x, min_date))
    # raw_data['week_end'] = raw_data['week_end'].apply(lambda x: min(x, max_date))

    raw_data['week_label'] = raw_data['week_start'].dt.strftime('%Y-%m-%d') + ' to ' + raw_data['week_end'].dt.strftime('%Y-%m-%d')
    numeric_columns = raw_data.select_dtypes(include=['number']).columns.tolist()
    agg_columns = ['week_label'] + [col for col in numeric_columns if col not in ['week_start', 'week_end']] + ['sku']
    weekly_data = raw_data[agg_columns].groupby(['week_label', 'sku']).sum().reset_index()
    # Calculate net profit percentage, handling division by zero with proper float conversion
    weekly_data['net_profit_percentage'] = weekly_data.apply(
        lambda row: (float(row['net_profit']) / float(row['total_revenue']) * 100) if row['total_revenue'] != 0 else 0.0, 
        axis=1
    )

    weekly_data = weekly_data[['week_label', 'sku', 'net_profit', 'total_revenue', 'net_profit_percentage']]
    return weekly_data

def get_returns_report_by_day():

    query = """
    with returns_order_id as (
        select 
            distinct amazon_order_id
        from allorderspnl
        where return_settlement_id is not null
    )
    select 
            purchase_date_pst_pdt AS date_by_day,
            amazon_order_id,
            sku,
            sum(COALESCE(quantity, 0)) as quantity,
            sum(
                COALESCE(statements_item_price, 0)
                + COALESCE(statements_shipping_price, 0)
                + COALESCE(statements_gift_wrap_price, 0)
                + COALESCE(statements_item_tax, 0)
                + COALESCE(statements_shipping_tax, 0)
                + COALESCE(statements_gift_wrap_tax, 0)
                + COALESCE(statements_order_other, 0)		
            ) as total_order_only_revenue,
            sum(
                COALESCE(statements_shipping_chargeback, 0)
                + COALESCE(statements_gift_wrap_chargeback, 0)
                + COALESCE(statements_item_promotion_discount, 0)	
                + COALESCE(statements_ship_promotion_discount, 0)		
                + COALESCE(statements_commission, 0)	
                + COALESCE(statements_sales_tax_service_fee, 0)	
                + COALESCE(statements_digital_services_fee, 0)	
                + COALESCE(statements_FBA_fulfillment_fee, 0)
                + COALESCE(statements_marketplace_facilitator_tax_principal, 0)	
                + COALESCE(statements_marketplace_facilitator_tax_shipping, 0)
            ) as total_order_only_expenses,
            sum(COALESCE(statements_item_price, 0)) as principal_revenue,
            
            sum(
                COALESCE(returns_shipping_chargeback, 0)
                + COALESCE(returns_gift_wrap_chargeback, 0)
                + COALESCE(returns_item_promotion_discount, 0)	
                + COALESCE(returns_ship_promotion_discount, 0)
                + COALESCE(returns_commission, 0)
                + COALESCE(returns_marketplace_facilitator_tax_principal, 0)	
                + COALESCE(returns_marketplace_facilitator_tax_shipping, 0)
                + COALESCE(returns_digital_services_fee, 0)	
                + COALESCE(returns_fbm_shipping_commission, 0)	
                + COALESCE(statements_return_other, 0)	
            ) as returned_expenses,
            sum(
                COALESCE(returns_shipping_chargeback, 0)
                + COALESCE(returns_gift_wrap_chargeback, 0)
            ) as returns_non_principal_chargebacks,
            sum(
                COALESCE(returns_item_promotion_discount, 0)	
                + COALESCE(returns_ship_promotion_discount, 0)
            ) as returns_promotion_discounts_reversal,
            sum(
                COALESCE(returns_commission, 0)
            ) as returns_commission_reversal,
            sum(
                COALESCE(returns_marketplace_facilitator_tax_principal, 0)	
                + COALESCE(returns_marketplace_facilitator_tax_shipping, 0)
            ) as returns_marketplace_facilitator_tax_reversal,
            sum(
                COALESCE(returns_digital_services_fee, 0)	
                + COALESCE(returns_fbm_shipping_commission, 0)	
                + COALESCE(statements_return_other, 0)	
            ) as returns_other_reversal,

            sum(
                COALESCE(returns_item_price, 0)
                + COALESCE(returns_item_price_goodwill_adjustment,0)
                + COALESCE(returns_shipping_price, 0)	
                + COALESCE(returns_gift_wrap_price, 0)
                + COALESCE(returns_item_tax, 0)	
                + COALESCE(returns_shipping_tax, 0)	
                + COALESCE(returns_gift_wrap_tax, 0)
                + COALESCE(returns_refund_commission, 0)
            ) as returned_revenue_and_return_comission,
            sum(
                COALESCE(returns_item_price, 0)
                + COALESCE(returns_item_price_goodwill_adjustment,0)
            ) as returns_principal_revenue_reversal,
            sum( 
                COALESCE(returns_shipping_price, 0)	
                + COALESCE(returns_gift_wrap_price, 0)	
            ) as returns_shipping_gift_wrap_revenue_reversal,
            sum( 
                COALESCE(returns_item_tax, 0)	
                + COALESCE(returns_shipping_tax, 0)	
                + COALESCE(returns_gift_wrap_tax, 0)			
            ) as returns_tax_reversal,
            sum( 
                COALESCE(returns_refund_commission, 0)	
            ) as returns_commission
    from allorderspnl
    where amazon_order_id in (select amazon_order_id from returns_order_id)
    group by purchase_date_pst_pdt, amazon_order_id, sku
    """
    
    result = db.session.execute(
        text(query),
    ).mappings().all()

    if not result:
        return pd.DataFrame(columns=[
            'date_by_day', 'amazon_order_id', 'sku', 'quantity',
            'total_order_only_profit','total_order_only_revenue','total_order_only_expenses', 'principal_revenue',
            
            'returned_expenses',
            'returns_non_principal_chargebacks',
            'returns_promotion_discounts_reversal',
            'returns_commission_reversal',
            'returns_marketplace_facilitator_tax_reversal',
            'returns_other_reversal',
            
            'returned_revenue_and_return_comission',
            'returns_principal_revenue_reversal',
            'returns_shipping_gift_wrap_revenue_reversal',
            'returns_tax_reversal',
            'returns_commission',

            'net'
        ])
    else:
        result = pd.DataFrame(result)
        result['date_by_day'] = pd.to_datetime(result['date_by_day']).dt.date
        result = result.groupby(['date_by_day', 'sku']).sum().reset_index()

        result['total_order_only_profit'] = result['total_order_only_revenue'].astype(float) + result['total_order_only_expenses'].astype(float)

        result['net'] = result['total_order_only_profit'].astype(float) + result['returned_expenses'].astype(float) + result['returned_revenue_and_return_comission'].astype(float) 

        desired_column_order = [
            'date_by_day', 'amazon_order_id', 'sku', 'quantity',
            'total_order_only_profit','total_order_only_revenue','total_order_only_expenses', 'principal_revenue',
            
            'returned_expenses',
            'returns_non_principal_chargebacks',
            'returns_promotion_discounts_reversal',
            'returns_commission_reversal',
            'returns_marketplace_facilitator_tax_reversal',
            'returns_other_reversal',
            
            'returned_revenue_and_return_comission',
            'returns_principal_revenue_reversal',
            'returns_shipping_gift_wrap_revenue_reversal',
            'returns_tax_reversal',
            'returns_commission',

            'net'
        ]

        # Reorder the DataFrame
        result = result[desired_column_order]

        return result
    

#-------------------------------------------------------------------------------------------------
# Overall Filter CRUD                                                                             |
#-------------------------------------------------------------------------------------------------
# Items for Filters
@app.route('/filters_all_brand_component_sku', methods=['GET'])
def get_filters_all_brand_component_sku():
    query = """
    select 
        distinct sku
    from allorderspnl
    """
    
    result = db.session.execute(text(query)).mappings().all()
    
    if not result:
        return jsonify({'error': 'No Amazon orders found'}), 404
    
    result_df = pd.DataFrame(result)

    # Safely handle potential None values in sku
    import re
    
    def extract_brand(sku):
        if not isinstance(sku, str):
            return None
        # Find the first set of string before "-" or "_" or numbers
        match = re.match(r'^([a-zA-Z]+)', sku)
        return match.group(1) if match else None
    
    def extract_main_component(sku):
        if not isinstance(sku, str):
            return None
        # Find brand first
        brand_match = re.match(r'^([a-zA-Z]+)', sku)
        if not brand_match:
            return None
        
        brand = brand_match.group(1)
        # Check if brand is immediately followed by numbers
        remaining = sku[len(brand):]
        number_match = re.match(r'^(\d+)', remaining)
        
        if number_match:
            # Brand + immediately following numbers
            return brand + number_match.group(1)
        else:
            # Just the brand
            return brand
    
    result_df['brand'] = result_df['sku'].apply(extract_brand)
    result_df['main_component'] = result_df['sku'].apply(extract_main_component)

    # Prepare cleaned lists
    brands = sorted(result_df['brand'].dropna().drop_duplicates().tolist())
    ir_items = sorted(result_df['main_component'].dropna().drop_duplicates().tolist())
    skus = sorted(result_df['sku'].dropna().tolist())

    return jsonify({
        'brands': brands,
        'ir_items': ir_items,
        'skus': skus
    })


#-------------------------------------------------------------------------------------------------
# Financial Overview CRUD                                                                         |
#-------------------------------------------------------------------------------------------------

@app.route('/summary_revenue_gross_margin_net_profit', methods=['GET'])
def get_summary_revenue_gross_margin_net_profit():

    # Get parameters from the request
    as_of_date = request.args.get('dateUpTo')
    period_display = request.args.get('displayMode', 'month')
    brand = request.args.get('brand')
    ir = request.args.get('ir')
    sku = request.args.get('sku')

    # If brand, ir, or sku are empty strings, set them to None
    if brand == '':
        brand = None
    if ir == '':
        ir = None
    if sku == '':
        sku = None

    # If as_of_date is not provided, get the latest date
    if not as_of_date:
        query = """
        select max(purchase_date_pst_pdt)
        from allorderspnl
        """
        latest_date_result = db.session.execute(text(query)).fetchone()
        if not latest_date_result or latest_date_result[0] is None:
            return jsonify({'error': 'No Orders data found'}), 404
        else:
            as_of_date = latest_date_result[0]
            as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d %H:%M:%S.%f')
    else:
        as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d')
        as_of_date = as_of_date.replace(hour=23, minute=59, second=59)

    # Get last period comparison as of date
    if period_display == 'month':
        last_period_comparison_as_of_date = as_of_date - relativedelta(months=1)
    elif period_display == 'quarter':
        last_period_comparison_as_of_date = as_of_date - relativedelta(months=3)
    elif period_display == 'year':
        last_period_comparison_as_of_date = as_of_date - relativedelta(years=1)

    # obtain this period and last period revenue, cogs, and operating expenses
    result_df = get_revenue_cogs_operating_expenses_period_start_to_period_end(as_of_date, period_display)
    last_period_result_df = get_revenue_cogs_operating_expenses_period_start_to_period_end(last_period_comparison_as_of_date, period_display)
    # Handle None or empty last period data
    if last_period_result_df.empty:
        last_period_result_df = pd.DataFrame(columns=result_df.columns)
        last_period_empty_flag = True

    result_df['brand'] = result_df['sku'].apply(lambda s: s.split('_', 1)[0] if isinstance(s, str) else None)
    result_df['main_component'] = result_df['sku'].apply(
        lambda s: s.split('_', 1)[-1].split('_', 1)[0] if isinstance(s, str) and '_' in s else None
    )
    # Apply filters if provided
    if brand is not None:
        result_df = result_df[result_df['brand'] == brand]
    if ir is not None:
        result_df = result_df[result_df['main_component'] == ir]
    if sku is not None:
        result_df = result_df[result_df['sku'] == sku]

    last_period_result_df['brand'] = last_period_result_df['sku'].apply(lambda s: s.split('_', 1)[0] if isinstance(s, str) else None)
    last_period_result_df['main_component'] = last_period_result_df['sku'].apply(
        lambda s: s.split('_', 1)[-1].split('_', 1)[0] if isinstance(s, str) and '_' in s else None
    )
    # Apply filters if provided
    if brand is not None:
        last_period_result_df = last_period_result_df[last_period_result_df['brand'] == brand]
    if ir is not None:
        last_period_result_df = last_period_result_df[last_period_result_df['main_component'] == ir]
    if sku is not None:
        last_period_result_df = last_period_result_df[last_period_result_df['sku'] == sku]

    # Revenue This Period and Comparison
    revenue = result_df['total_revenue'].sum()
    revenue_last_period = last_period_result_df['total_revenue'].sum()

    revenue_paid_portion = result_df[result_df['payment_status'] == 'Paid']['total_revenue'].sum()
    revenue_unpaid_portion = result_df[result_df['payment_status'] == 'Unpaid']['total_revenue'].sum()
    revenue_returns_portion = result_df['revenue_returns'].sum()
    revenue_other_portion = result_df['revenue_other'].sum()
    revenue_sales_portion = revenue - revenue_returns_portion - revenue_other_portion

    revenue_period_to_period_variance_percentage = (
        abs((revenue - revenue_last_period) / revenue_last_period * 100)
        if revenue_last_period not in [0, None, np.nan] else 0
    )
    if pd.notna(revenue_last_period) and revenue < revenue_last_period:
        revenue_period_to_period_sign = False
    else:
        revenue_period_to_period_sign = True

    # Gorss Margin This Period and Comparison
    cogs = result_df['COGS'].sum()
    cogs_last_period = last_period_result_df['COGS'].sum()

    gross_margin = revenue - cogs
    gross_margin_percentage = ((gross_margin / revenue * 100) if revenue != 0 else 0)

    gross_margin_last_period = revenue_last_period - cogs_last_period
    gross_margin_percentage_last_period = (
        (gross_margin_last_period / revenue_last_period * 100)
        if revenue_last_period not in [0, None, np.nan] else 0
    )

    gross_margin_period_to_period_variance_percentage = (
        abs((gross_margin - gross_margin_last_period) / gross_margin_last_period * 100)
        if gross_margin_last_period not in [0, None, np.nan] else 0
    )
    if pd.notna(gross_margin_last_period) and gross_margin < gross_margin_last_period:
        gross_margin_period_to_period_sign = False
    else:
        gross_margin_period_to_period_sign = True

    # Operating Expenses This Period and Comparison
    operating_expenses = result_df['total_operating_expenses'].sum()
    operating_expenses_last_period = last_period_result_df['total_operating_expenses'].sum()

    operating_expenses_paid_portion = result_df[result_df['payment_status'] == 'Paid']['total_operating_expenses'].sum()
    operating_expenses_unpaid_portion = result_df[result_df['payment_status'] == 'Unpaid']['total_operating_expenses'].sum()
    operating_expenses_returns_portion = result_df['operating_expenses_returns'].sum()
    operating_expenses_non_returns_portion = operating_expenses - operating_expenses_returns_portion

    net_profit = revenue - cogs + operating_expenses
    net_profit_percentage = ((net_profit / revenue * 100) if revenue != 0 else 0)

    net_profit_last_period = revenue_last_period - cogs_last_period + operating_expenses_last_period
    net_profit_percentage_last_period = (
        (net_profit_last_period / revenue_last_period * 100)
        if revenue_last_period not in [0, None, np.nan] else 0
    )

    net_profit_period_to_period_variance_percentage = (
        abs((net_profit - net_profit_last_period) / net_profit_last_period * 100)
        if net_profit_last_period not in [0, None, np.nan] else 0
    )
    if pd.notna(net_profit_last_period) and net_profit < net_profit_last_period:
        net_profit_period_to_period_sign = False
    else:
        net_profit_period_to_period_sign = True
    
    if revenue_last_period not in [0, None, np.nan]:
        last_period_revenue_exist_flag = True
    else:
        last_period_revenue_exist_flag = False

    if gross_margin_last_period not in [0, None, np.nan]:
        last_period_gross_margin_exist_flag = True
    else:
        last_period_gross_margin_exist_flag = False

    if net_profit_last_period not in [0, None, np.nan]:
        last_period_net_profit_exist_flag = True
    else:
        last_period_net_profit_exist_flag = False

    # Convert result to dictionary
    summary_revenue_gross_margin_net_profit = {
        'latest_date': str(as_of_date),
        'period_to_period_reference_date': str(last_period_comparison_as_of_date),

        'revenue': float(revenue),
        'revenue_paid_portion': float(revenue_paid_portion),
        'revenue_unpaid_portion': float(revenue_unpaid_portion),
        'revenue_returns_portion': float(revenue_returns_portion),
        'revenue_sales_portion': float(revenue_sales_portion),
        'revenue_other_portion': float(revenue_other_portion),

        'cogs': float(cogs),
        'gross_margin': float(gross_margin),
        'gross_margin_percentage': float(gross_margin_percentage),
        
        'operating_expenses': float(operating_expenses * -1),
        'net_profit': float(net_profit),
        'net_profit_percentage': float(net_profit_percentage),
        'operating_expenses_paid_portion': float(operating_expenses_paid_portion * -1),
        'operating_expenses_unpaid_portion': float(operating_expenses_unpaid_portion * -1),
        'operating_expenses_returns_portion': float(operating_expenses_returns_portion * -1),
        'operating_expenses_non_returns_portion': float(operating_expenses_non_returns_portion * -1),

        'revenue_last_period': float(revenue_last_period),
        'revenue_period_to_period_variance_percentage': float(revenue_period_to_period_variance_percentage),
        'revenue_period_to_period_sign': bool(revenue_period_to_period_sign),

        'gross_margin_last_period': float(gross_margin_last_period),
        'gross_margin_percentage_last_period': float(gross_margin_percentage_last_period),
        'gross_margin_period_to_period_variance_percentage': float(gross_margin_period_to_period_variance_percentage),
        'gross_margin_period_to_period_sign': bool(gross_margin_period_to_period_sign),

        'net_profit_last_period': float(net_profit_last_period),
        'net_profit_percentage_last_period': float(net_profit_percentage_last_period),
        'net_profit_period_to_period_variance_percentage': float(net_profit_period_to_period_variance_percentage),
        'net_profit_period_to_period_sign': bool(net_profit_period_to_period_sign),

        'last_period_revenue_exist_flag': bool(last_period_revenue_exist_flag),
        'last_period_gross_margin_exist_flag': bool(last_period_gross_margin_exist_flag),
        'last_period_net_profit_exist_flag': bool(last_period_net_profit_exist_flag)
    }
    
    return jsonify(summary_revenue_gross_margin_net_profit)

@app.route('/summary_revenue_gross_margin_net_profit_chart_data', methods=['GET'])
def get_summary_revenue_gross_margin_net_profit_chart_data():
    """
    Endpoint to get formatted financial data for Nivo chart with:
    1. Lines for gross margin percentage and net profit percentage (left y-axis)
    2. Stacked bars for net profit, operating expenses, and COGS (right y-axis)
    3. Months/Quarters/Years on x-axis 
    """
    try:
        # Get parameters from the request
        as_of_date = request.args.get('dateUpTo')
        period_display = request.args.get('displayMode', 'month')
        brand = request.args.get('brand')
        ir = request.args.get('ir')
        sku = request.args.get('sku')

        # If brand, ir, or sku are empty strings, set them to None
        if brand == '':
            brand = None
        if ir == '':
            ir = None
        if sku == '':
            sku = None

        # If as_of_date is not provided, get the latest date
        if not as_of_date:
            query = """
            select max(purchase_date_pst_pdt)
            from allorderspnl
            """
            latest_date_result = db.session.execute(text(query)).fetchone()
            if not latest_date_result or latest_date_result[0] is None:
                return jsonify({'error': 'No Orders data found'}), 404
            else:
                as_of_date = latest_date_result[0]
                as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d %H:%M:%S.%f')
        else:
            as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d')
            as_of_date = as_of_date.replace(hour=23, minute=59, second=59)

        # Get financial data from the existing function
        financial_df = get_revenue_cogs_operating_expenses_by_period_since_beginning(as_of_date, period_display)
        
        if isinstance(financial_df, tuple):  # Check if it's an error response
            return financial_df
        
       # Step 1: Ensure datetime and create base time columns
        financial_df['data_month_last_day'] = pd.to_datetime(financial_df['data_month_last_day'])

        # Create period columns
        financial_df['month'] = financial_df['data_month_last_day'].dt.strftime("%b'%y")
        financial_df['quarter'] = financial_df['data_month_last_day'].apply(lambda x: f"Q{((x.month - 1) // 3 + 1)}'{str(x.year)[-2:]}")
        financial_df['year'] = financial_df['data_month_last_day'].dt.strftime("%Y")

        # Create period sort key (used after groupby) and Generate full period list to join with filtered data later on to preserve missing periods
        # 1. Determine date range
        start_date = financial_df['data_month_last_day'].min()
        end_date = financial_df['data_month_last_day'].max()
        # 2. Extend the end date to include full period
        if period_display == 'month':
            end_date = end_date + pd.offsets.MonthEnd(0)
        elif period_display == 'quarter':
            end_date = end_date + pd.offsets.QuarterEnd(0)
        elif period_display == 'year':
            end_date = end_date + pd.offsets.YearEnd(0)
        # 3. Build full canonical period list with period and sort key
        if period_display == 'month':
            all_periods = pd.date_range(start=start_date, end=end_date, freq='M')
            period_sort_df = pd.DataFrame({
                'period_sort_key': all_periods,
                'period': all_periods.strftime("%b'%y")
            })
        elif period_display == 'quarter':
            all_periods = pd.date_range(start=start_date, end=end_date, freq='Q')
            period_sort_df = pd.DataFrame({
                'period_sort_key': all_periods,
                'period': all_periods.to_series().apply(lambda x: f"Q{((x.month - 1) // 3 + 1)}'{str(x.year)[-2:]}")
            })
        elif period_display == 'year':
            all_periods = pd.date_range(start=start_date, end=end_date, freq='Y')
            period_sort_df = pd.DataFrame({
                'period_sort_key': all_periods,
                'period': all_periods.strftime("%Y")
            })

        # Step 2: Apply filters if provided
        financial_df['brand'] = financial_df['sku'].apply(lambda s: s.split('_', 1)[0] if isinstance(s, str) else None)
        financial_df['main_component'] = financial_df['sku'].apply(
            lambda s: s.split('_', 1)[-1].split('_', 1)[0] if isinstance(s, str) and '_' in s else None
        )
        if brand is not None:
            financial_df = financial_df[financial_df['brand'] == brand]
        if ir is not None:
            financial_df = financial_df[financial_df['main_component'] == ir]
        if sku is not None:
            financial_df = financial_df[financial_df['sku'] == sku]

        # Step 3: Group and aggregate
        agg_df = financial_df.groupby(period_display).agg({
            'total_revenue': 'sum',
            'COGS': 'sum',
            'total_operating_expenses': 'sum'
        }).reset_index().rename(columns={period_display: 'period'})

        # Step 4: Join with full period list to retain missing periods
        financial_df = pd.merge(period_sort_df, agg_df, on='period', how='left')
        financial_df[['total_revenue', 'COGS', 'total_operating_expenses']] = financial_df[[
            'total_revenue', 'COGS', 'total_operating_expenses'
        ]].fillna(0)

        # Step 5: Limit to most recent 12 periods
        financial_df = financial_df.tail(12)

        # Calculate gross margin and net profit
        financial_df['total_operating_expenses'] = financial_df['total_operating_expenses'] * -1
        financial_df['gross_margin'] = financial_df['total_revenue'] - financial_df['COGS']
        financial_df['net_profit'] = financial_df['total_revenue'] - financial_df['COGS'] - financial_df['total_operating_expenses']
        financial_df['gross_margin_percentage'] = np.where(
            financial_df['total_revenue'] != 0,
            financial_df['gross_margin'] / financial_df['total_revenue'] * 100,
            0
        )

        financial_df['net_profit_percentage'] = np.where(
            financial_df['total_revenue'] != 0,
            financial_df['net_profit'] / financial_df['total_revenue'] * 100,
            0
        )

        # Ensure percentage values are properly formatted
        financial_df['gross_margin_percentage'] = financial_df['gross_margin_percentage'].round(1)
        financial_df['net_profit_percentage'] = financial_df['net_profit_percentage'].round(1)
        
        # Create an entry for each month
        financial_df = financial_df.fillna(0)
        result_data = []
        for _, row in financial_df.iterrows():
            data = {
                'month': row['period'],
                'revenue': row['total_revenue'],
                'COGS': row['COGS'],
                'Gross Margin': row['gross_margin'],
                'Operating Expenses': row['total_operating_expenses'],
                'Net Profit': row['net_profit'],
                'Gross Margin %': row['gross_margin_percentage'],
                'Net Profit %': row['net_profit_percentage'],
            }
            result_data.append(data)
        
        return jsonify(result_data)
    
    except Exception as e:
        app.logger.error(f"Error in /summary_revenue_gross_margin_net_profit_chart_data: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/SKU_sales_performance_revenue_quantity_pie_chart_data', methods=['GET'])
def get_SKU_sales_performance_revenue_quantity_pie_chart_data():

    # Get parameters from the request
    as_of_date = request.args.get('dateUpTo')
    period_display = request.args.get('displayMode', 'month')

    # If as_of_date is not provided, get the latest date
    if not as_of_date:
        query = """
        select max(purchase_date_pst_pdt)
        from allorderspnl
        """
        latest_date_result = db.session.execute(text(query)).fetchone()
        if not latest_date_result or latest_date_result[0] is None:
            return jsonify({'error': 'No Orders data found'}), 404
        else:
            as_of_date = latest_date_result[0]
            as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d %H:%M:%S.%f')
    else:
        as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d')
        as_of_date = as_of_date.replace(hour=23, minute=59, second=59)

    # return main component, sku, revenue, quantity
    main_component_sku_sales_result = get_main_component_sales(as_of_date, period_display)

    if main_component_sku_sales_result.empty:
        return jsonify({'error': 'No sales data found'}), 404

    # Group by main component
    grouped = main_component_sku_sales_result.groupby('main_component').agg({
        'revenue': 'sum',
        'quantity': 'sum'
    }).reset_index()
    grouped = grouped.sort_values('revenue', ascending=False)

    # Find top 5 by revenue
    top5 = grouped.nlargest(5, 'revenue')
    top5_names = set(top5['main_component'])

    # Prepare pie data
    pie_data_revenue = []
    pie_data_quantity = []

    others_revenue = 0
    others_quantity = 0

    for _, row in grouped.iterrows():
        component = row['main_component']
        rev = row['revenue']
        qty = row['quantity']

        if component in top5_names:
            pie_data_revenue.append({'id': component, 'value': rev})
            pie_data_quantity.append({'id': component, 'value': qty})
        else:
            others_revenue += rev
            others_quantity += qty

    pie_data_revenue.append({'id': 'Other', 'value': others_revenue})
    pie_data_quantity.append({'id': 'Other', 'value': others_quantity})

    # Prepare tooltip breakdown
    tooltip_data = (
        main_component_sku_sales_result.groupby(['main_component', 'sku'])
        .agg({'revenue': 'sum', 'quantity': 'sum'})
        .reset_index()
        .sort_values(['main_component', 'revenue'], ascending=[True, False])
    )

    # Merge tooltips into a dict
    tooltip_dict = {}
    for _, row in tooltip_data.iterrows():
        base = row['main_component']
        sku = row['sku']
        rev = row['revenue']
        qty = row['quantity']
        if base not in tooltip_dict:
            tooltip_dict[base] = []
        tooltip_dict[base].append({
            'sku': sku,
            'revenue': rev,
            'quantity': qty
        })

    return jsonify({
        'pie_by_revenue': pie_data_revenue,
        'pie_by_quantity': pie_data_quantity,
        'tooltip_details': tooltip_dict,
        'as_of_date': as_of_date.strftime('%Y-%m-%d')
    })

@app.route('/SKU_profitability_horizontal_bar_chart_data', methods=['GET'])
def get_SKU_profitability_horizontal_bar_chart_data():
    # Get the display mode (top5 or bottom5) from query parameters
    display_mode = request.args.get('mode', 'top5')
    # Get parameters from the request
    as_of_date = request.args.get('dateUpTo')
    period_display = request.args.get('displayMode', 'month')

    # If as_of_date is not provided, get the latest date
    if not as_of_date:
        query = """
        select max(purchase_date_pst_pdt)
        from allorderspnl
        """
        latest_date_result = db.session.execute(text(query)).fetchone()
        if not latest_date_result or latest_date_result[0] is None:
            return jsonify({'error': 'No Orders data found'}), 404
        else:
            as_of_date = latest_date_result[0]
            as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d %H:%M:%S.%f')
    else:
        as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d')
        as_of_date = as_of_date.replace(hour=23, minute=59, second=59)

    # return main component, sku, revenue, cogs, operating expenses, gross margin, net profit
    main_component_sku_profitability_result = get_main_component_gross_margin_net_profit(as_of_date, period_display)

    if main_component_sku_profitability_result.empty:
        return jsonify({'error': 'No profitability data found'}), 404
    
    main_component_sku_profitability_result = main_component_sku_profitability_result.groupby(['main_component','sku']).agg({
        'revenue': 'sum',
        'gross_margin': 'sum',
        'net_profit': 'sum'
    }).reset_index()
    main_component_sku_profitability_result['gross_margin_percentage'] = main_component_sku_profitability_result.apply(
        lambda row: row['gross_margin'] / row['revenue'] * 100 if row['revenue'] != 0 else 0, axis=1
    )
    main_component_sku_profitability_result['net_profit_percentage'] = main_component_sku_profitability_result.apply(
        lambda row: row['net_profit'] / row['revenue'] * 100 if row['revenue'] != 0 else 0, axis=1
    )

    # Group by main component
    grouped = main_component_sku_profitability_result.groupby('main_component').agg({
        'revenue': 'sum',
        'gross_margin': 'sum',
        'net_profit': 'sum'
    }).reset_index()
    grouped['gross_margin_percentage'] = grouped.apply(
        lambda row: row['gross_margin'] / row['revenue'] * 100 if row['revenue'] != 0 else 0, axis=1
    )
    grouped['net_profit_percentage'] = grouped.apply(
        lambda row: row['net_profit'] / row['revenue'] * 100 if row['revenue'] != 0 else 0, axis=1
    )
    grouped = grouped.sort_values('net_profit_percentage', ascending=False)

    # Find top/bottom 5 by net_profit_percentage based on display mode
    if display_mode == 'top5':
        selected_components = grouped.nlargest(5, 'net_profit_percentage')
    else:  # bottom5
        selected_components = grouped.nsmallest(5, 'net_profit_percentage')
    
    selected_names = set(selected_components['main_component'])

    # Prepare bar data
    bar_data_gross_margin_percentage_selected = []
    bar_data_net_profit_percentage_selected = []

    others_revenue = 0
    others_gross_margin = 0
    others_net_profit = 0

    for _, row in grouped.iterrows():
        component = row['main_component']
        rev = row['revenue']
        gross_margin = row['gross_margin']
        net_profit = row['net_profit']
        gross_margin_percentage = row['gross_margin_percentage']
        net_profit_percentage = row['net_profit_percentage']

        if component in selected_names:
            bar_data_gross_margin_percentage_selected.append({'id': component, 'value': gross_margin_percentage})
            bar_data_net_profit_percentage_selected.append({'id': component, 'value': net_profit_percentage})
        else:
            others_revenue += rev
            others_gross_margin += gross_margin
            others_net_profit += net_profit
    
    bar_data_gross_margin_percentage = []
    bar_data_net_profit_percentage = []

    others_gross_margin_percentage = others_gross_margin / others_revenue * 100 if others_revenue != 0 else 0
    others_net_profit_percentage = others_net_profit / others_revenue * 100 if others_revenue != 0 else 0
    bar_data_gross_margin_percentage.append({'id': 'Other', 'value': others_gross_margin_percentage})
    bar_data_net_profit_percentage.append({'id': 'Other', 'value': others_net_profit_percentage})

    # For top5 mode we display in ascending order (reverse from database order)
    # For bottom5 we also want to show from lowest to highest (which means keeping the database order)
    if display_mode == 'top5':
        bar_data_gross_margin_percentage_selected = list(reversed(bar_data_gross_margin_percentage_selected))
        bar_data_net_profit_percentage_selected = list(reversed(bar_data_net_profit_percentage_selected))
    
    bar_data_gross_margin_percentage.extend(bar_data_gross_margin_percentage_selected)
    bar_data_net_profit_percentage.extend(bar_data_net_profit_percentage_selected)

    # Prepare tooltip breakdown
    tooltip_data = (
        main_component_sku_profitability_result.groupby(['main_component', 'sku'])
        .agg({'gross_margin_percentage': 'sum', 'net_profit_percentage': 'sum'})
        .reset_index()
        .sort_values(['main_component', 'net_profit_percentage'], ascending=[True, False])
    )

    # Merge tooltips into a dict
    tooltip_dict = {}
    for _, row in tooltip_data.iterrows():
        base = row['main_component']
        sku = row['sku']
        gross_margin_percentage = row['gross_margin_percentage']
        net_profit_percentage = row['net_profit_percentage']
        if base not in tooltip_dict:
            tooltip_dict[base] = []
        tooltip_dict[base].append({
            'sku': sku,
            'gross_margin_percentage': gross_margin_percentage,
            'net_profit_percentage': net_profit_percentage
        })

    return jsonify({
        'bar_by_gross_margin_percentage': bar_data_gross_margin_percentage,
        'bar_by_net_profit_percentage': bar_data_net_profit_percentage,
        'tooltip_details': tooltip_dict,
        'as_of_date': as_of_date.strftime('%Y-%m-%d')
    })

@app.route('/summary_AR_AP_and_statements_closing_chart_data', methods=['GET'])
def get_summary_AR_AP_and_statements_closing_chart_data():
    try:
        # Get parameters from the request
        as_of_date = request.args.get('dateUpTo')
        brand = request.args.get('brand')
        ir = request.args.get('ir')
        sku = request.args.get('sku')

        if as_of_date:
            as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d').date()
        if brand == '':
            brand = None
        if ir == '':
            ir = None
        if sku == '':
            sku = None

        # Get AR AP data based on amazon order and statements
        AR_AP_df = get_AR_AP_by_date()
        
        # Get statements closing data
        statements_closing_df = get_statements_deposit_closing_AR_AP_by_date()

        # Merge AR AP and statements closing data
        merged_df = pd.merge(
            AR_AP_df, 
            statements_closing_df, 
            left_on=['date', 'sku'], 
            right_on=['deposit_date_pst_pdt', 'sku'], 
            how='left')
        merged_df = merged_df.drop(columns=['deposit_date_pst_pdt'])
        
        # Apply filters if provided
        merged_df['brand'] = merged_df['sku'].apply(lambda s: s.split('_', 1)[0] if isinstance(s, str) else None)
        merged_df['main_component'] = merged_df['sku'].apply(
            lambda s: s.split('_', 1)[-1].split('_', 1)[0] if isinstance(s, str) and '_' in s else None
        )
        if brand:
            merged_df = merged_df[merged_df['brand'] == brand]
        if ir:
            merged_df = merged_df[merged_df['main_component'] == ir]
        if sku:
            merged_df = merged_df[merged_df['sku'] == sku]

        merged_df = merged_df.groupby('date')[merged_df.select_dtypes(include='number').columns].sum().reset_index()
        
        # cumulative AR and AP trend
        merged_df['AR_closing'] = merged_df['AR_closing'].fillna(0)
        merged_df['AP_closing'] = merged_df['AP_closing'].fillna(0)
        merged_df = merged_df.sort_values(by='date')

        merged_df['AR_cumulative'] = (merged_df['AR'] - merged_df['AR_closing']).cumsum()
        merged_df['AP_cumulative'] = (merged_df['AP'] - merged_df['AP_closing']).cumsum()

        if as_of_date:
            merged_df = merged_df[merged_df['date'] <= as_of_date]
        cutoff_date = merged_df['date'].max() - timedelta(days=120)
        merged_df = merged_df[merged_df['date'] >= cutoff_date]

        # Create an entry for each date
        result_data = []
        for _, row in merged_df.iterrows():
            result_data.append({
                'date': row['date'].isoformat(),  # e.g., "2024-01-01"
                'AR_cumulative': round(row['AR_cumulative'], 2),
                'AP_cumulative': round(row['AP_cumulative'], 2),
                'AR_closing': round(row['AR_closing'], 2),
                'AP_closing': round(row['AP_closing'], 2)
            })
        
        # Get latest AR and AP values
        latest_row = merged_df.iloc[-1]
        latest_AR_cumulative = round(latest_row['AR_cumulative'], 2)
        latest_AP_cumulative = round(latest_row['AP_cumulative'], 2)
        latest_date = latest_row['date'].isoformat()
        
        # Return both chart data and latest values
        return jsonify({
            'chart_data': result_data,
            'latest_values': {
                'AR_cumulative': latest_AR_cumulative,
                'AP_cumulative': latest_AP_cumulative,
                'date': latest_date
            }
        })
    
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/summary_AP_vendor', methods=['GET'])
def get_summary_AP_vendor():
    try:
        # Get parameters from the request
        as_of_date = request.args.get('dateUpTo')
        brand = request.args.get('brand')
        ir = request.args.get('ir')

        # If as_of_date is not provided, get the latest date
        if not as_of_date:
            query = """
            select max(purchase_date_pst_pdt)
            from allorderspnl
            """
            latest_date_result = db.session.execute(text(query)).fetchone()
            if not latest_date_result or latest_date_result[0] is None:
                return jsonify({'error': 'No Orders data found'}), 404
            else:
                as_of_date = latest_date_result[0]
                as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d %H:%M:%S.%f')
        else:
            as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d')
            as_of_date = as_of_date.replace(hour=23, minute=59, second=59)
        if brand == '':
            brand = None
        if ir == '':
            ir = None

        vendor_payment_paid_and_AP_df = get_vendor_payment_paid_and_AP()
        
        exceptions = ['ALEG', 'V3520']
        def custom_ir_extraction(product):
            if isinstance(product, str) and any(product.startswith(prefix) for prefix in exceptions):
                return product  # keep original
            else:
                return product.rsplit('-', 1)[0] if isinstance(product, str) and '-' in product else product
        vendor_payment_paid_and_AP_df['ir'] = vendor_payment_paid_and_AP_df['product'].apply(custom_ir_extraction)
        query = """
        select
            distinct sku as sku
            from allorderspnl
        """
        unique_sku_result = pd.DataFrame(db.session.execute(text(query)).mappings().all())
        unique_sku_result = unique_sku_result.rename(columns={'sku': 'SKU'})
        
        def first_matched_SKU(ir):
            matched = unique_sku_result[unique_sku_result['SKU'].str.contains(f"{ir}", case=False, na=False)]
            return matched['SKU'].iloc[0] if not matched.empty else None
        vendor_payment_paid_and_AP_df['sku_one_example'] = vendor_payment_paid_and_AP_df['ir'].apply(first_matched_SKU)
        vendor_payment_paid_and_AP_df = vendor_payment_paid_and_AP_df.drop(columns=['ir'])
        vendor_payment_paid_and_AP_df['brand'] = vendor_payment_paid_and_AP_df['sku_one_example'].apply(lambda s: s.split('_', 1)[0] if isinstance(s, str) else None)
        vendor_payment_paid_and_AP_df['main_component'] = vendor_payment_paid_and_AP_df['sku_one_example'].apply(
            lambda s: s.split('_', 1)[-1].split('_', 1)[0] if isinstance(s, str) and '_' in s else None
        )
        vendor_payment_paid_and_AP_df = vendor_payment_paid_and_AP_df.drop(columns=['sku_one_example'])

        # Apply filters if provided
        if brand is not None:
            vendor_payment_paid_and_AP_df = vendor_payment_paid_and_AP_df[vendor_payment_paid_and_AP_df['brand'] == brand]
        if ir is not None:
            vendor_payment_paid_and_AP_df = vendor_payment_paid_and_AP_df[vendor_payment_paid_and_AP_df['main_component'] == ir]

        
        
        vendor_payment_paid_and_AP_df['order_date'] = pd.to_datetime(vendor_payment_paid_and_AP_df['order_date'])
        vendor_payment_paid_and_AP_df['payment_date'] = pd.to_datetime(
            vendor_payment_paid_and_AP_df['payment_date'].fillna('2099-01-01')
        )
        vendor_payment_paid_and_AP_df = vendor_payment_paid_and_AP_df[vendor_payment_paid_and_AP_df['order_date'] <= as_of_date]

        # vendor_payment_paid_and_AP_df.to_csv('vendor_payment_paid_and_AP_df.csv', index=False)

        vendor_payment_paid_and_AP_df['total_cost'] = pd.to_numeric(vendor_payment_paid_and_AP_df['total_cost'],errors='coerce')
        vendor_payment_paid_and_AP_df['total_cost'] = vendor_payment_paid_and_AP_df['total_cost'].fillna(0)

        # vendor_payment_paid_and_AP_df.to_csv('vendor_payment_paid_and_AP_df.csv', index=False)

        # Calculate the total AP for each vendor
        total_AP_by_vendor = vendor_payment_paid_and_AP_df[
            (vendor_payment_paid_and_AP_df['payment_date'].isna()) |
            (vendor_payment_paid_and_AP_df['payment_date'] > as_of_date)
        ]['total_cost'].sum() * 1.13 * -1
        
        total_AP_by_vendor_without_MMM = vendor_payment_paid_and_AP_df[
            ((vendor_payment_paid_and_AP_df['payment_date'].isna()) |
            (vendor_payment_paid_and_AP_df['payment_date'] > as_of_date)) &
            (vendor_payment_paid_and_AP_df['name'] != 'MMM')
        ]['total_cost'].sum() * 1.13 * -1
        
        return jsonify({
            'total_AP_to_vendor': round(total_AP_by_vendor, 2),
            'total_AP_to_vendor_without_MMM': round(total_AP_by_vendor_without_MMM, 2)
        })
    
    except Exception as e:
        app.logger.error(f"Error in /summary_AP_vendor: {e}")
        return jsonify({'error': str(e)}), 500

#-------------------------------------------------------------------------------------------------
# COGS Details CRUD                                                                               |
#-------------------------------------------------------------------------------------------------

@app.route('/cogs_details/COGS_summary_card', methods=['GET'])
def get_cogs_details_COGS_summary_card():

    # Get parameters from the request
    as_of_date = request.args.get('dateUpTo')
    period_display = request.args.get('displayMode', 'month')
    brand = request.args.get('brand')
    ir = request.args.get('ir')
    sku = request.args.get('sku')

    # If brand, ir, or sku are empty strings, set them to None
    if brand == '':
        brand = None
    if ir == '':
        ir = None
    if sku == '':
        sku = None

    # If as_of_date is not provided, get the latest date
    if not as_of_date:
        query = """
        select max(purchase_date_pst_pdt)
        from allorderspnl
        """
        latest_date_result = db.session.execute(text(query)).fetchone()
        if not latest_date_result or latest_date_result[0] is None:
            return jsonify({'error': 'No Orders data found'}), 404
        else:
            as_of_date = latest_date_result[0]
            as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d %H:%M:%S.%f')
    else:
        as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d')
        as_of_date = as_of_date.replace(hour=23, minute=59, second=59)

    result_df = get_cogs_details_by_component_type(as_of_date, period_display)
    
    # Apply filters if provided
    if brand is not None:
        result_df = result_df[result_df['brand'] == brand]
    if ir is not None:
        result_df = result_df[result_df['main_component'] == ir]
    if sku is not None:
        result_df = result_df[result_df['sku'] == sku]

    total_cogs = result_df['COGS'].sum()
    total_gross_margin = result_df['total_revenue'].sum() - total_cogs
    total_gross_margin_percentage = total_gross_margin / result_df['total_revenue'].sum() * 100 if result_df['total_revenue'].sum() != 0 else 0
    
    # Get COGS by component type
    component_cogs = result_df.groupby('component_type')['COGS'].sum().to_dict()
    
    # Ensure all component types are present even if they have zero COGS
    for comp_type in ['PC', 'Hardware', 'Accessory', 'OS']:
        if comp_type not in component_cogs:
            component_cogs[comp_type] = 0
    
    # Basic component percentages of total COGS
    component_cogs_percentage_as_of_total_cogs = {k: v / total_cogs if total_cogs > 0 else 0 for k, v in component_cogs.items()}
    
    # Calculate component COGS percentage 
    total_COGS_percentage = 1 - (total_gross_margin_percentage / 100)  # Convert percentage to decimal
    component_cost_percentage = {k: v * total_COGS_percentage * 100 if total_cogs > 0 else 0 for k, v in component_cogs_percentage_as_of_total_cogs.items()}
    
    # Get period string for display
    if period_display == 'month':
        period_str = as_of_date.strftime("%B %Y")
    else:  # quarter
        quarter_num = (as_of_date.month - 1) // 3 + 1
        period_str = f"Q{quarter_num} {as_of_date.year}"
    
    # Create response
    response = {
        'total_cogs': float(total_cogs),
        'component_cogs': component_cogs,
        'total_gross_margin': float(total_gross_margin),
        'total_gross_margin_percentage': float(total_gross_margin_percentage),
        'component_cost_percentage': component_cost_percentage,
        'period': period_str,
        'as_of_date': as_of_date.strftime('%Y-%m-%d'),
        'filters': {
            'brand': brand or 'All',
            'ir': ir or 'All',
            'sku': sku or 'All',
            'displayMode': period_display
        }
    }
    
    return jsonify(response) 

@app.route('/cogs_details/COGS_pie_chart_data_brand_in_PC', methods=['GET'])
def get_cogs_details_COGS_pie_chart_data_brand_in_PC():
    # Get parameters from the request
    as_of_date = request.args.get('dateUpTo')
    period_display = request.args.get('displayMode', 'month')

    # If as_of_date is not provided, get the latest date
    if not as_of_date:
        query = """
        select max(purchase_date_pst_pdt)
        from allorderspnl
        """
        latest_date_result = db.session.execute(text(query)).fetchone()
        if not latest_date_result or latest_date_result[0] is None:
            return jsonify({'error': 'No Orders data found'}), 404
        else:
            as_of_date = latest_date_result[0]
            as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d %H:%M:%S.%f')
    else:
        as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d')
        as_of_date = as_of_date.replace(hour=23, minute=59, second=59)

    result_df = get_cogs_details_by_component_type(as_of_date, period_display)

    # Filter for PC only
    result_df = result_df[result_df['component_type'] == 'PC']

    # Group by brand for pie chart
    pie_df = result_df.groupby('brand')['COGS'].sum().reset_index()
    pie_df = pie_df.sort_values('COGS', ascending=False)

    # Aggregate into top 5 + others
    top_n = 5
    top_brands = pie_df.head(top_n)
    others_sum = pie_df.iloc[top_n:]['COGS'].sum()
    pie_data = [
        {"id": row["brand"], "value": row["COGS"]}
        for _, row in top_brands.iterrows()
    ]
    if others_sum > 0:
        pie_data.append({"id": "Other", "value": others_sum})

    total_cogs = result_df['COGS'].sum()

    return jsonify({
        "pie_by_brand": pie_data,
        "total": float(total_cogs),
        "as_of_date": as_of_date.strftime('%Y-%m-%d')
    })

@app.route('/cogs_details/COGS_pie_chart_data_product_in_hardware_accessory_os', methods=['GET'])
def get_cogs_details_COGS_pie_chart_data_product_in_hardware_accessory_os():
    # Get parameters from the request
    as_of_date = request.args.get('dateUpTo')
    period_display = request.args.get('displayMode', 'month')
    
    # Get the active tab parameter (0=PC, 1=Hardware, 2=Accessory, 3=Operating System)
    active_tab = request.args.get('activeTab', '1')
    active_tab = int(active_tab) if active_tab.isdigit() else 1
    
    # Map active tab to category
    tab_category_map = {
        0: 'PC',        # This shouldn't be used for this endpoint, but included for completeness
        1: 'Hardware',
        2: 'Accessory',
        3: 'Operating System'
    }
    
    category = tab_category_map.get(active_tab, 'Hardware')
    
    # If as_of_date is not provided, get the latest date
    if not as_of_date:
        query = """
        select max(purchase_date_pst_pdt)
        from allorderspnl
        """
        latest_date_result = db.session.execute(text(query)).fetchone()
        if not latest_date_result or latest_date_result[0] is None:
            return jsonify({'error': 'No Orders data found'}), 404
        else:
            as_of_date = latest_date_result[0]
            as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d %H:%M:%S.%f')
    else:
        as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d')
        as_of_date = as_of_date.replace(hour=23, minute=59, second=59)

    result_df = get_cogs_details_by_component_type(as_of_date, period_display)

    # Filter base on active tab
    if category == 'Hardware':
        result_df = result_df[result_df['component_type'] == 'Hardware']
    elif category == 'Accessory':
        result_df = result_df[result_df['component_type'] == 'Accessory']
    elif category == 'Operating System':
        result_df = result_df[result_df['component_type'] == 'OS']

    # Group by product for pie chart
    pie_df = result_df.groupby('product')['COGS'].sum().reset_index()
    pie_df = pie_df.sort_values('COGS', ascending=False)

    # Aggregate into top 5 + others
    top_n = 5
    top_products = pie_df.head(top_n)
    others_sum = pie_df.iloc[top_n:]['COGS'].sum()
    pie_data = [
        {"id": row["product"], "value": row["COGS"]}
        for _, row in top_products.iterrows()
    ]
    if others_sum > 0:
        pie_data.append({"id": "Other", "value": others_sum})

    total_cogs = result_df['COGS'].sum()

    return jsonify({
        "pie_by_product": pie_data,
        "total": float(total_cogs),
        "as_of_date": as_of_date.strftime('%Y-%m-%d')
    })

@app.route('/cogs_details/PO_pie_chart_data_brand_in_PC', methods=['GET'])
def get_cogs_details_PO_pie_chart_data_brand_in_PC():

    # Get parameters from the request
    as_of_date = request.args.get('dateUpTo')
    period_display = request.args.get('displayMode', 'month')

    # If as_of_date is not provided, get the latest date
    if not as_of_date:
        query = """
        select max(purchase_date_pst_pdt)
        from allorderspnl
        """
        latest_date_result = db.session.execute(text(query)).fetchone()
        if not latest_date_result or latest_date_result[0] is None:
            return jsonify({'error': 'No Orders data found'}), 404
        else:
            as_of_date = latest_date_result[0]
            as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d %H:%M:%S.%f')
    else:
        as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d')
        as_of_date = as_of_date.replace(hour=23, minute=59, second=59)

    result_df = get_PO_details_by_component_type(as_of_date, period_display)

    # Filter for PC only
    result_df = result_df[result_df['component_type'] == 'PC']

    # Group by brand for pie chart
    pie_df = result_df.groupby('brand')[['purchase_cost', 'purchase_quantity']].sum().reset_index()
    pie_df = pie_df.sort_values('purchase_cost', ascending=False)

    # Aggregate into top 5 + others
    top_n = 5
    top_brands = pie_df.head(top_n)
    others_sum_purchase_cost = pie_df.iloc[top_n:]['purchase_cost'].sum()
    others_sum_purchase_quantity = pie_df.iloc[top_n:]['purchase_quantity'].sum()
    pie_data = [
        {"id": row["brand"], "purchase_cost": row["purchase_cost"], "purchase_quantity": row["purchase_quantity"]}
        for _, row in top_brands.iterrows()
    ]
    if others_sum_purchase_cost > 0:
        pie_data.append({"id": "Other", "purchase_cost": others_sum_purchase_cost, "purchase_quantity": others_sum_purchase_quantity})

    total_purchase_cost = pie_df['purchase_cost'].sum()
    total_purchase_quantity = pie_df['purchase_quantity'].sum()

    return jsonify({
        "pie_by_brand": pie_data,
        "total": {
            "purchase_cost": float(total_purchase_cost),
            "purchase_quantity": float(total_purchase_quantity)
        },
        "as_of_date": as_of_date.strftime('%Y-%m-%d')
    })

@app.route('/cogs_details/PO_pie_chart_data_product_in_hardware_accessory_os', methods=['GET'])
def get_cogs_details_PO_pie_chart_data_product_in_hardware_accessory_os():

    # Get parameters from the request
    as_of_date = request.args.get('dateUpTo')
    period_display = request.args.get('displayMode', 'month')

    # Get the active tab parameter (0=PC, 1=Hardware, 2=Accessory, 3=Operating System)
    active_tab = request.args.get('activeTab', '1')
    active_tab = int(active_tab) if active_tab.isdigit() else 1

    # Map active tab to category
    tab_category_map = {
        0: 'PC',        # This shouldn't be used for this endpoint, but included for completeness
        1: 'Hardware',
        2: 'Accessory',
        3: 'Operating System'
    }
    
    category = tab_category_map.get(active_tab, 'Hardware')

    # If as_of_date is not provided, get the latest date
    if not as_of_date:
        query = """
        select max(purchase_date_pst_pdt)
        from allorderspnl
        """
        latest_date_result = db.session.execute(text(query)).fetchone()
        if not latest_date_result or latest_date_result[0] is None:
            return jsonify({'error': 'No Orders data found'}), 404
        else:
            as_of_date = latest_date_result[0]
            as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d %H:%M:%S.%f')
    else:
        as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d')
        as_of_date = as_of_date.replace(hour=23, minute=59, second=59)

    result_df = get_PO_details_by_component_type(as_of_date, period_display)

    # Filter base on active tab
    if category == 'Hardware':
        result_df = result_df[result_df['component_type'] == 'Hardware']
    elif category == 'Accessory':
        result_df = result_df[result_df['component_type'] == 'Accessory']
    elif category == 'Operating System':
        result_df = result_df[result_df['component_type'] == 'OS']

    # Group by product for pie chart
    pie_df = result_df.groupby('product')[['purchase_cost', 'purchase_quantity']].sum().reset_index()
    pie_df = pie_df.sort_values('purchase_cost', ascending=False)

    # Aggregate into top 5 + others
    top_n = 5
    top_products = pie_df.head(top_n)
    others_sum_purchase_cost = pie_df.iloc[top_n:]['purchase_cost'].sum()
    others_sum_purchase_quantity = pie_df.iloc[top_n:]['purchase_quantity'].sum()
    pie_data = [
        {"id": row["product"], "purchase_cost": row["purchase_cost"], "purchase_quantity": row["purchase_quantity"]}
        for _, row in top_products.iterrows()
    ]
    if others_sum_purchase_cost > 0:
        pie_data.append({"id": "Other", "purchase_cost": others_sum_purchase_cost, "purchase_quantity": others_sum_purchase_quantity})

    total_purchase_cost = pie_df['purchase_cost'].sum()
    total_purchase_quantity = pie_df['purchase_quantity'].sum()

    return jsonify({
        "pie_by_product": pie_data,
        "total": {
            "purchase_cost": float(total_purchase_cost),
            "purchase_quantity": float(total_purchase_quantity)
        },
        "as_of_date": as_of_date.strftime('%Y-%m-%d')
    })

@app.route('/cogs_details/PO_average_cost_by_period', methods=['GET'])
def get_cogs_details_PO_average_cost_by_period():
    # Get parameters from the request
    as_of_date = request.args.get('dateUpTo')
    period_display = request.args.get('displayMode', 'month')
    brand = request.args.get('brand')
    ir = request.args.get('ir')

    # If brand, ir, or sku are empty strings, set them to None
    if brand == '':
        brand = None
    if ir == '':
        ir = None

    # If as_of_date is not provided, get the latest date
    if not as_of_date:
        query = """
        select max(purchase_date_pst_pdt)
        from allorderspnl
        """
        latest_date_result = db.session.execute(text(query)).fetchone()
        if not latest_date_result or latest_date_result[0] is None:
            return jsonify({'error': 'No Orders data found'}), 404
        else:
            as_of_date = latest_date_result[0]
            as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d %H:%M:%S.%f')
    else:
        as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d')
        as_of_date = as_of_date.replace(hour=23, minute=59, second=59)

    result_df = get_PO_average_cost_by_period()
    result_df['order_date'] = pd.to_datetime(result_df['order_date'])

    # Create brand and main component columns
    result_df['brand'] = result_df['sku_one_example'].apply(lambda s: s.split('_', 1)[0] if isinstance(s, str) else None)
    result_df['main_component'] = result_df['sku_one_example'].apply(
        lambda s: s.split('_', 1)[-1].split('_', 1)[0] if isinstance(s, str) and '_' in s else None
    )
    result_df = result_df.drop(columns=['sku_one_example'])

    # Apply filters if provided
    if brand is not None:
        result_df = result_df[result_df['brand'] == brand]
    if ir is not None:
        result_df = result_df[result_df['main_component'] == ir]
    result_df = result_df[result_df['order_date'] <= as_of_date]

    # Create period columns
    result_df['month'] = result_df['order_date'].dt.strftime("%b'%y")
    result_df['quarter'] = result_df['order_date'].apply(lambda x: f"Q{((x.month - 1) // 3 + 1)}'{str(x.year)[-2:]}")
    result_df['period'] = result_df['month'] if period_display == 'month' else result_df['quarter']
    result_df['parsed_period'] = pd.to_datetime(result_df['order_date'].dt.to_period('M' if period_display == 'month' else 'Q').astype(str))

    # Aggregate by period and IR
    grouped = result_df.groupby(['period', 'parsed_period', 'main_component']).agg(
        total_cost=pd.NamedAgg(column='purchase_unit_price', aggfunc=lambda x: (x * result_df.loc[x.index, 'purchase_quantity']).sum()),
        total_quantity=pd.NamedAgg(column='purchase_quantity', aggfunc='sum')
    ).reset_index()

    grouped['average_procurement_cost'] = grouped['total_cost'] / grouped['total_quantity']
    grouped.rename(columns={'main_component': 'ir'}, inplace=True)

    # Fill missing periods per IR (your style)
    min_date = grouped['parsed_period'].min()
    max_date = grouped['parsed_period'].max()
    full_range = pd.date_range(start=min_date, end=max_date, freq='MS' if period_display == 'month' else 'QS')
    all_irs = grouped['ir'].dropna().unique()

    filled_list = []
    for current_ir in all_irs:
        ir_df = grouped[grouped['ir'] == current_ir].set_index('parsed_period')
        ir_df = ir_df.reindex(full_range)
        ir_df['ir'] = current_ir
        ir_df['period'] = ir_df.index.strftime("%b'%y") if period_display == 'month' else \
                          ir_df.index.to_series().apply(lambda d: f"Q{((d.month - 1) // 3 + 1)}'{str(d.year)[-2:]}")
        filled_list.append(ir_df.reset_index(drop=True))

    final_df = pd.concat(filled_list).reset_index(drop=True)
    final_df['parsed_period'] = pd.to_datetime(final_df['period'], format="%b'%y", errors='coerce')
    final_df = final_df.sort_values(by=['ir', 'parsed_period']).drop(columns=['parsed_period'])
    final_df = final_df[['period', 'ir', 'average_procurement_cost']]
    final_df = final_df.replace({np.nan: None})

    return jsonify(final_df.to_dict(orient='records'))

@app.route('/cogs_details/dsi', methods=['GET'])
def get_cogs_details_dsi():
    # Get parameters from the request
    as_of_date = request.args.get('dateUpTo')
    brand = request.args.get('brand')
    ir = request.args.get('ir')
    sku = request.args.get('sku')

    # If brand, ir, or sku are empty strings, set them to None
    if brand == '':
        brand = None
    if ir == '':
        ir = None
    if sku == '':
        sku = None

    # If as_of_date is not provided, get the latest date
    if not as_of_date:
        query = """
        select max(purchase_date_pst_pdt)
        from allorderspnl
        """
        latest_date_result = db.session.execute(text(query)).fetchone()
        if not latest_date_result or latest_date_result[0] is None:
            return jsonify({'error': 'No Orders data found'}), 404
        else:
            as_of_date = latest_date_result[0]
            as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d %H:%M:%S.%f')
    else:
        as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d')
        as_of_date = as_of_date.replace(hour=23, minute=59, second=59)

    DSI_30days = get_DSI(as_of_date, 30)
    DSI_60days = get_DSI(as_of_date, 60)
    DSI_90days = get_DSI(as_of_date, 90)

    # Get all unique SKUs across the three DSI results
    all_skus = pd.Series(
        pd.concat([DSI_30days['SKU'], DSI_60days['SKU'], DSI_90days['SKU']])
    ).dropna().unique()

    # Create a base DataFrame with all unique SKUs
    dsi_df = pd.DataFrame({'SKU': all_skus})

    # Merge DSI values
    dsi_df = dsi_df.merge(DSI_30days[['SKU', 'DSI']].rename(columns={'DSI': 'DSI_30days'}), on='SKU', how='left')
    dsi_df = dsi_df.merge(DSI_60days[['SKU', 'DSI']].rename(columns={'DSI': 'DSI_60days'}), on='SKU', how='left')
    dsi_df = dsi_df.merge(DSI_90days[['SKU', 'DSI']].rename(columns={'DSI': 'DSI_90days'}), on='SKU', how='left')

    # Apply filters if provided
    if brand is not None:
        dsi_df = dsi_df[dsi_df['SKU'].str.startswith(brand)]
    if ir is not None:
        dsi_df = dsi_df[dsi_df['SKU'].str.contains(ir)]
    if sku is not None:
        dsi_df = dsi_df[dsi_df['SKU'] == sku]

    # Total row calc
    if brand is not None:
        DSI_30days = DSI_30days[DSI_30days['SKU'].str.startswith(brand)]
        DSI_60days = DSI_60days[DSI_60days['SKU'].str.startswith(brand)]
        DSI_90days = DSI_90days[DSI_90days['SKU'].str.startswith(brand)]
    if ir is not None:
        DSI_30days = DSI_30days[DSI_30days['SKU'].str.contains(ir)]
        DSI_60days = DSI_60days[DSI_60days['SKU'].str.contains(ir)]
        DSI_90days = DSI_90days[DSI_90days['SKU'].str.contains(ir)]
    if sku is not None:
        DSI_30days = DSI_30days[DSI_30days['SKU'] == sku]
        DSI_60days = DSI_60days[DSI_60days['SKU'] == sku]
        DSI_90days = DSI_90days[DSI_90days['SKU'] == sku]

    def compute_total_dsi(df, days):
        if df.empty or df['COGS'].sum() == 0:
            return None
        avg_inventory = (df['inventory_start_value'].sum() + df['inventory_end_value'].sum()) / 2
        return (avg_inventory / df['COGS'].sum()) * days

    total_DSI_30days = compute_total_dsi(DSI_30days, 30)
    total_DSI_60days = compute_total_dsi(DSI_60days, 60)
    total_DSI_90days = compute_total_dsi(DSI_90days, 90)

    # Append total row
    total_row = pd.DataFrame([{
        'SKU': 'Total',
        'DSI_30days': total_DSI_30days,
        'DSI_60days': total_DSI_60days,
        'DSI_90days': total_DSI_90days
    }])

    dsi_df = pd.concat([dsi_df, total_row], ignore_index=True)

    # Add sort key: 0 for 'Total', 1 for others
    dsi_df['sort_key'] = dsi_df['SKU'].apply(lambda x: 0 if x == 'Total' else 1)

    # Sort by sort_key first, then by DSI_30days (ascending)
    dsi_df = dsi_df.sort_values(by=['sort_key', 'DSI_30days'], ascending=[True, True]).drop(columns='sort_key')

    # ir po cost trend
    ir_PO_cost_trend = get_PO_average_cost_by_period()
    ir_PO_cost_trend['order_date'] = pd.to_datetime(ir_PO_cost_trend['order_date'])
    ir_PO_cost_trend['month_start_date'] = ir_PO_cost_trend['order_date'].values.astype('datetime64[M]')

    ir_PO_cost_trend['main_component'] = ir_PO_cost_trend['sku_one_example'].apply(
        lambda s: s.split('_', 1)[-1].split('_', 1)[0] if isinstance(s, str) and '_' in s else None
    )
    ir_PO_cost_trend = ir_PO_cost_trend.drop(columns=['sku_one_example'])

    ir_PO_cost_trend = ir_PO_cost_trend.groupby(['month_start_date', 'main_component']).agg(
        total_cost=pd.NamedAgg(column='purchase_unit_price', aggfunc=lambda x: (x * ir_PO_cost_trend.loc[x.index, 'purchase_quantity']).sum()),
        total_quantity=pd.NamedAgg(column='purchase_quantity', aggfunc='sum')
    ).reset_index()
    ir_PO_cost_trend['average_procurement_cost'] = ir_PO_cost_trend['total_cost'] / ir_PO_cost_trend['total_quantity']

    min_month_costs = ir_PO_cost_trend.sort_values('month_start_date').groupby('main_component').first().reset_index()
    max_month_costs = ir_PO_cost_trend.sort_values('month_start_date').groupby('main_component').last().reset_index()

    # Rename columns
    min_month_costs = min_month_costs[['main_component', 'average_procurement_cost']].rename(columns={'average_procurement_cost': 'min_month_PO_cost'})
    max_month_costs = max_month_costs[['main_component', 'average_procurement_cost']].rename(columns={'average_procurement_cost': 'max_month_PO_cost'})

    # Step 4: Merge into one summary table
    ir_procurement_cost_at_min_max_months = pd.merge(min_month_costs, max_month_costs, on='main_component', how='outer')

    dsi_df['main_component'] = dsi_df['SKU'].apply(
        lambda s: s.split('_', 1)[-1].split('_', 1)[0] if isinstance(s, str) and '_' in s else None
    )
    dsi_df = dsi_df.merge(ir_procurement_cost_at_min_max_months, on='main_component', how='left')
    dsi_df = dsi_df.drop(columns='main_component')

    dsi_df['PO_cost_trend'] = (dsi_df['min_month_PO_cost'] < dsi_df['max_month_PO_cost']).fillna(False)
    dsi_df.drop(columns=['min_month_PO_cost', 'max_month_PO_cost'], inplace=True)

    dsi_df['Consider_Repurchase_Flag'] = False
    dsi_df.loc[dsi_df['DSI_30days'] < 30, 'Consider_Repurchase_Flag'] = True
    dsi_df.loc[dsi_df['DSI_60days'] < 30, 'Consider_Repurchase_Flag'] = True
    dsi_df.loc[
        (dsi_df['DSI_30days'] < dsi_df['DSI_60days']) & 
        ((dsi_df['DSI_30days'] < 60) | (dsi_df['DSI_60days'] < 60)),
        'Consider_Repurchase_Flag'
    ] = True
    dsi_df.loc[
        ((dsi_df['DSI_30days'] < 60) | (dsi_df['DSI_60days'] < 60) | (dsi_df['DSI_90days'] < 60)) &
        (dsi_df['PO_cost_trend']),
        'Consider_Repurchase_Flag'
    ] = True

    # Initialize empty reason column
    dsi_df['Flag_Reason'] = None

    # Rule 3: DSI declining and moderately low
    dsi_df.loc[
        (dsi_df['DSI_30days'] < dsi_df['DSI_60days']) & 
        ((dsi_df['DSI_30days'] < 60) | (dsi_df['DSI_60days'] < 60)),
        'Flag_Reason'
    ] = 'Moderately low DSI (<60) and declining DSI'

    # Rule 2: Low-ish DSI and rising procurement cost
    dsi_df.loc[
        ((dsi_df['DSI_30days'] < 60) | (dsi_df['DSI_60days'] < 60) | (dsi_df['DSI_90days'] < 60)) &
        (dsi_df['PO_cost_trend']),
        'Flag_Reason'
    ] = 'Moderately low DSI (<60) and rising cost'

    # Rule 1: Low DSI < 30
    dsi_df.loc[
        (dsi_df['DSI_30days'] < 30) | (dsi_df['DSI_60days'] < 30),
        'Flag_Reason'
    ] = 'Low DSI (<30)'

    return jsonify(dsi_df.to_dict(orient='records'))


#-------------------------------------------------------------------------------------------------
# Operating Expenses Details CRUD                                                                 |
#-------------------------------------------------------------------------------------------------
@app.route('/operating_expenses_details_summary_card', methods=['GET'])
def get_operating_expenses_details_summary_card():

    # Get parameters from the request
    as_of_date = request.args.get('dateUpTo')
    period_display = request.args.get('displayMode', 'month')
    brand = request.args.get('brand')
    ir = request.args.get('ir')
    sku = request.args.get('sku')

    # If brand, ir, or sku are empty strings, set them to None
    if brand == '':
        brand = None
    if ir == '':
        ir = None
    if sku == '':
        sku = None

    # If as_of_date is not provided, get the latest date
    if not as_of_date:
        query = """
        select max(purchase_date_pst_pdt)
        from allorderspnl
        """
        latest_date_result = db.session.execute(text(query)).fetchone()
        if not latest_date_result or latest_date_result[0] is None:
            return jsonify({'error': 'No Orders data found'}), 404
        else:
            as_of_date = latest_date_result[0]
            as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d %H:%M:%S.%f')
    else:
        as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d')
        as_of_date = as_of_date.replace(hour=23, minute=59, second=59)

    # obtain this period and last period revenue, cogs, and operating expenses
    result_df = get_operating_expenses_breakdown(as_of_date, period_display)

    
    result_df['brand'] = result_df['sku'].apply(lambda s: s.split('_', 1)[0] if isinstance(s, str) else None)
    result_df['main_component'] = result_df['sku'].apply(
        lambda s: s.split('_', 1)[-1].split('_', 1)[0] if isinstance(s, str) and '_' in s else None
    )
    # Apply filters if provided
    if brand is not None:
        result_df = result_df[result_df['brand'] == brand]
    if ir is not None:
        result_df = result_df[result_df['main_component'] == ir]
    if sku is not None:
        result_df = result_df[result_df['sku'] == sku]
    
    metric_columns = [
        'total_revenue', 'total_operating_expenses',
        'operating_expenses_commission', 
        'operating_expenses_advertisements', 'operating_expenses_promotions', 
        'operating_expenses_FBA_fees', 'operating_expenses_FBM_fees', 'operating_expenses_FBM_shipping',
        'operating_expenses_service_fees',
        'operating_expenses_marketplace_facilitator_tax',
        'operating_expenses_revenue_chargebacks',
        'operating_expenses_returns' 
    ]

    result_df = (
        result_df[metric_columns]
        .fillna(0)
        .sum()
        .reset_index()
        .rename(columns={'index': 'metrics', 0: 'values'})
    )

    total_revenue = result_df.loc[result_df['metrics'] == 'total_revenue', 'values'].values[0]

    # Calculate percentage of revenue
    result_df['percentage_of_revenue'] = result_df['values'] / total_revenue * -1 if total_revenue else pd.NA

    # Get period string for display
    if period_display == 'month':
        period_str = as_of_date.strftime("%B %Y")
    else:  # quarter
        quarter_num = (as_of_date.month - 1) // 3 + 1
        period_str = f"Q{quarter_num} {as_of_date.year}"

    total_operating_expenses = result_df.loc[result_df['metrics'] == 'total_operating_expenses', 'values'].values[0]
    total_operating_expense_percentage = total_operating_expenses / total_revenue * 100 * -1 if total_revenue else pd.NA

    operating_expenses_breakdown = result_df[~result_df['metrics'].isin(['total_revenue', 'total_operating_expenses'])]

    response = {
        'period_str': period_str,
        'as_of_date': as_of_date.strftime('%Y-%m-%d'),
        'total_operating_expenses': float(total_operating_expenses),
        'total_operating_expense_percentage': float(total_operating_expense_percentage),
        'operating_expenses_breakdown': operating_expenses_breakdown.to_dict()
    }

    return jsonify(response)

@app.route('/operating_expenses_details_trend_chart_by_brand', methods=['GET'])
def get_operating_expenses_details_trend_chart_by_brand():

    # Get parameters from the request
    as_of_date = request.args.get('dateUpTo')
    period_display = request.args.get('displayMode', 'month')
    brand = request.args.get('brand')
    ir = request.args.get('ir')
    sku = request.args.get('sku')

    # If brand, ir, or sku are empty strings, set them to None
    if brand == '':
        brand = None
    if ir == '':
        ir = None
    if sku == '':
        sku = None
    
    # If as_of_date is not provided, get the latest date
    if not as_of_date:
        query = """
        select max(purchase_date_pst_pdt)
        from allorderspnl
        """
        latest_date_result = db.session.execute(text(query)).fetchone()
        if not latest_date_result or latest_date_result[0] is None:
            return jsonify({'error': 'No Orders data found'}), 404
        else:
            as_of_date = latest_date_result[0]
            as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d %H:%M:%S.%f')
    else:
        as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d')
        as_of_date = as_of_date.replace(hour=23, minute=59, second=59)
    
    # get operating expenses breakdown since beginning
    operating_expenses_breakdown_since_beginning = get_operating_expenses_breakdown_since_beginning(as_of_date)
    negate_cols = [col for col in operating_expenses_breakdown_since_beginning.columns if col not in ['purchase_date_pst_pdt', 'data_month_last_day', 'sales_status', 'payment_status', 'sku', 'total_revenue']]
    operating_expenses_breakdown_since_beginning[negate_cols] = operating_expenses_breakdown_since_beginning[negate_cols] * -1

    # Step 1: Ensure datetime and create base time columns
    operating_expenses_breakdown_since_beginning['data_month_last_day'] = pd.to_datetime(operating_expenses_breakdown_since_beginning['data_month_last_day'])

    # Create period columns
    operating_expenses_breakdown_since_beginning['month'] = operating_expenses_breakdown_since_beginning['data_month_last_day'].dt.strftime("%b'%y")
    operating_expenses_breakdown_since_beginning['quarter'] = operating_expenses_breakdown_since_beginning['data_month_last_day'].apply(lambda x: f"Q{((x.month - 1) // 3 + 1)}'{str(x.year)[-2:]}")
    operating_expenses_breakdown_since_beginning['year'] = operating_expenses_breakdown_since_beginning['data_month_last_day'].dt.strftime("%Y")

    # Create period sort key (used after groupby) and Generate full period list to join with filtered data later on to preserve missing periods
    # 1. Determine date range
    start_date = operating_expenses_breakdown_since_beginning['data_month_last_day'].min()
    end_date = operating_expenses_breakdown_since_beginning['data_month_last_day'].max()
    # 2. Extend the end date to include full period
    if period_display == 'month':
        end_date = end_date + pd.offsets.MonthEnd(0)
    elif period_display == 'quarter':
        end_date = end_date + pd.offsets.QuarterEnd(0)
    elif period_display == 'year':
        end_date = end_date + pd.offsets.YearEnd(0)
    # 3. Build full canonical period list with period and sort key
    if period_display == 'month':
        all_periods = pd.date_range(start=start_date, end=end_date, freq='M')
        if len(all_periods) > 6:
            all_periods = all_periods[-6:]  # keep only latest 6 months
        period_sort_df = pd.DataFrame({
            'period_sort_key': all_periods,
            'period': all_periods.strftime("%b'%y")
        })

    elif period_display == 'quarter':
        all_periods = pd.date_range(start=start_date, end=end_date, freq='Q')
        if len(all_periods) > 6:
            all_periods = all_periods[-6:]  # keep only latest 6 quarters
        period_sort_df = pd.DataFrame({
            'period_sort_key': all_periods,
            'period': all_periods.to_series().apply(lambda x: f"Q{((x.month - 1) // 3 + 1)}'{str(x.year)[-2:]}")
        })

    elif period_display == 'year':
        all_periods = pd.date_range(start=start_date, end=end_date, freq='Y')
        if len(all_periods) > 6:
            all_periods = all_periods[-6:]  # keep only latest 6 years
        period_sort_df = pd.DataFrame({
            'period_sort_key': all_periods,
            'period': all_periods.strftime("%Y")
        })

    operating_expenses_breakdown_since_beginning['brand'] = operating_expenses_breakdown_since_beginning['sku'].apply(lambda s: s.split('_', 1)[0] if isinstance(s, str) else None)
    operating_expenses_breakdown_since_beginning['main_component'] = operating_expenses_breakdown_since_beginning['sku'].apply(
            lambda s: s.split('_', 1)[-1].split('_', 1)[0] if isinstance(s, str) and '_' in s else None
        )
    if brand is not None:
        operating_expenses_breakdown_since_beginning = operating_expenses_breakdown_since_beginning[operating_expenses_breakdown_since_beginning['brand'] == brand]
    if ir is not None:
        operating_expenses_breakdown_since_beginning = operating_expenses_breakdown_since_beginning[operating_expenses_breakdown_since_beginning['main_component'] == ir]
    if sku is not None:
        operating_expenses_breakdown_since_beginning = operating_expenses_breakdown_since_beginning[operating_expenses_breakdown_since_beginning['sku'] == sku]
    operating_expenses_breakdown_since_beginning['brand'] = operating_expenses_breakdown_since_beginning['brand'].fillna('NonSKU_NonSKU_NonSKU')
    agg_df = operating_expenses_breakdown_since_beginning.groupby(['brand', period_display]).agg({
            'total_revenue': 'sum',
            'total_operating_expenses': 'sum',
            'operating_expenses_commission': 'sum',
            'operating_expenses_advertisements': 'sum',
            'operating_expenses_promotions': 'sum',
            'operating_expenses_FBA_fees': 'sum',
            'operating_expenses_FBM_fees': 'sum',
            'operating_expenses_FBM_shipping': 'sum',
            'operating_expenses_service_fees': 'sum',
            'operating_expenses_marketplace_facilitator_tax': 'sum',
            'operating_expenses_revenue_chargebacks': 'sum',
            'operating_expenses_returns': 'sum'
        }).reset_index().rename(columns={period_display: 'period'})
    
    # Create full period-brand combinations
    all_brands = agg_df['brand'].unique()
    period_brand_df = pd.merge(
        period_sort_df.assign(key=1),
        pd.DataFrame({'brand': all_brands}).assign(key=1),
        on='key'
    ).drop('key', axis=1)

    # Join with full period list to preserve missing periods
    agg_df = pd.merge(
        period_brand_df, 
        agg_df, 
        left_on=['period', 'brand'], 
        right_on=['period', 'brand'], 
        how='left'
    )

    # Fill NA with 0 for numeric columns
    numeric_cols = [col for col in agg_df.columns if col not in ['brand', 'period', 'period_sort_key']]
    agg_df[numeric_cols] = agg_df[numeric_cols].fillna(0)

    # Calculate Operating Expenses / Revenue %
    agg_df['Operating Expenses / Revenue %'] = agg_df.apply(
        lambda row: (row['total_operating_expenses'] / row['total_revenue'] * 100)
        if row['total_revenue'] else 0,
        axis=1
    )

    # Round the percentage
    agg_df['Operating Expenses / Revenue %'] = agg_df['Operating Expenses / Revenue %'].round(1)

    # Sort by period
    agg_df.sort_values(by=['brand', 'period_sort_key'], inplace=True)

    # Drop sort key and convert to records
    final_df = agg_df.drop(columns=['period_sort_key'])
    final_df = final_df[final_df['brand'] != 'NonSKU_NonSKU_NonSKU']

    return jsonify(final_df.to_dict(orient='records'))

@app.route('/operating_expenses_items_breakdown_summary_card', methods=['GET'])
def get_operating_expenses_items_breakdown_summary_card():
    
    # Get parameters from the request
    as_of_date = request.args.get('dateUpTo')
    period_display = request.args.get('displayMode', 'month')
    brand = request.args.get('brand')
    ir = request.args.get('ir')
    sku = request.args.get('sku')

    # If brand, ir, or sku are empty strings, set them to None
    if brand == '':
        brand = None
    if ir == '':
        ir = None
    if sku == '':
        sku = None

    # If as_of_date is not provided, get the latest date
    if not as_of_date:
        query = """
        select max(purchase_date_pst_pdt)
        from allorderspnl
        """
        latest_date_result = db.session.execute(text(query)).fetchone()
        if not latest_date_result or latest_date_result[0] is None:
            return jsonify({'error': 'No Orders data found'}), 404
        else:
            as_of_date = latest_date_result[0]
            as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d %H:%M:%S.%f')
    else:
        as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d')
        as_of_date = as_of_date.replace(hour=23, minute=59, second=59)

    # get operating expenses items breakdown
    result_df = get_operating_expenses_detailed_items_breakdown(as_of_date, period_display)
    result_df['brand'] = result_df['sku'].apply(lambda s: s.split('_', 1)[0] if isinstance(s, str) else None)
    result_df['main_component'] = result_df['sku'].apply(
        lambda s: s.split('_', 1)[-1].split('_', 1)[0] if isinstance(s, str) and '_' in s else None
    )

    # Apply filters if provided
    if brand is not None:
        result_df = result_df[result_df['brand'] == brand]
    if ir is not None:
        result_df = result_df[result_df['main_component'] == ir]
    if sku is not None:
        result_df = result_df[result_df['sku'] == sku]

    # organize result based on expense item selection
    expense_item_selection = request.args.get('expenseItem')
    revenue_total = result_df['total_revenue'].sum()

    if expense_item_selection == 'advertisements':
        advertisements_total = result_df['operating_expenses_advertisements'].sum()
        advertisements_percentage = advertisements_total / revenue_total * 100 * -1
        advertisement_non_sales = result_df[result_df['sales_status'] == 'Non-Sales']['operating_expenses_advertisements'].sum()
        advertisement_non_sales_percentage = advertisement_non_sales / revenue_total * 100 * -1
        advertisement_sales = result_df[result_df['sales_status'] == 'Sales']['operating_expenses_advertisements'].sum()
        advertisement_sales_percentage = advertisement_sales / revenue_total * 100 * -1
        return jsonify({
            'advertisements_total': float(advertisements_total),
            'advertisements_percentage': float(advertisements_percentage),
            'advertisement_non_sales': float(advertisement_non_sales),
            'advertisement_non_sales_percentage': float(advertisement_non_sales_percentage),
            'advertisement_sales': float(advertisement_sales),
            'advertisement_sales_percentage': float(advertisement_sales_percentage)
        })
    elif expense_item_selection == 'fba_fees':
        FBA_fees_total = result_df['operating_expenses_FBA_fees'].sum()
        FBA_fees_percentage = FBA_fees_total / revenue_total * 100 * -1
        FBA_fulfillment_fee = result_df['FBA_fulfillment_fee'].sum()
        FBA_fulfillment_fee_percentage = FBA_fulfillment_fee / revenue_total * 100 * -1
        FBA_inbound_transportation_fee = result_df['FBA_inbound_transportation_fee'].sum()
        FBA_inbound_transportation_fee_percentage = FBA_inbound_transportation_fee / revenue_total * 100 * -1
        FBA_storage_fee = result_df['FBA_storage_fee'].sum()
        FBA_storage_fee_percentage = FBA_storage_fee / revenue_total * 100 * -1
        return jsonify({
            'FBA_fees_total': float(FBA_fees_total),
            'FBA_fees_percentage': float(FBA_fees_percentage),
            'FBA_fulfillment_fee': float(FBA_fulfillment_fee),
            'FBA_fulfillment_fee_percentage': float(FBA_fulfillment_fee_percentage),
            'FBA_inbound_transportation_fee': float(FBA_inbound_transportation_fee),
            'FBA_inbound_transportation_fee_percentage': float(FBA_inbound_transportation_fee_percentage),
            'FBA_storage_fee': float(FBA_storage_fee),
            'FBA_storage_fee_percentage': float(FBA_storage_fee_percentage)
        })
    elif expense_item_selection == 'service_fees':
        service_fees_total = result_df['operating_expenses_service_fees'].sum()
        service_fees_percentage = service_fees_total / revenue_total * 100 * -1
        sales_tax_service_fee = result_df['sales_tax_service_fee'].sum()
        sales_tax_service_fee_percentage = sales_tax_service_fee / revenue_total * 100 * -1
        digital_services_fee = result_df['digital_services_fee'].sum()
        digital_services_fee_percentage = digital_services_fee / revenue_total * 100 * -1
        subscription_fee = result_df['subscription_fee'].sum()
        subscription_fee_percentage = subscription_fee / revenue_total * 100 * -1
        return jsonify({
            'service_fees_total': float(service_fees_total),
            'service_fees_percentage': float(service_fees_percentage),
            'sales_tax_service_fee': float(sales_tax_service_fee),
            'sales_tax_service_fee_percentage': float(sales_tax_service_fee_percentage),
            'digital_services_fee': float(digital_services_fee),
            'digital_services_fee_percentage': float(digital_services_fee_percentage),
            'subscription_fee': float(subscription_fee),
            'subscription_fee_percentage': float(subscription_fee_percentage)
        })
    elif expense_item_selection == 'returns':
        returns_total = result_df['operating_expenses_returns'].sum()
        returns_percentage = returns_total / revenue_total * 100 * -1
        returns_shipping_gift_wrap = result_df['returns_shipping_gift_wrap'].sum()
        returns_shipping_gift_wrap_percentage = returns_shipping_gift_wrap / revenue_total * 100 * -1
        returns_tax = result_df['returns_tax'].sum()
        returns_tax_percentage = returns_tax / revenue_total * 100 * -1
        returns_refund_commission = result_df['returns_refund_commission'].sum()
        returns_refund_commission_percentage = returns_refund_commission / revenue_total * 100 * -1
        return jsonify({
            'returns_total': float(returns_total),
            'returns_percentage': float(returns_percentage),
            'returns_shipping_gift_wrap': float(returns_shipping_gift_wrap),
            'returns_shipping_gift_wrap_percentage': float(returns_shipping_gift_wrap_percentage),
            'returns_tax': float(returns_tax),
            'returns_tax_percentage': float(returns_tax_percentage),
            'returns_refund_commission': float(returns_refund_commission),
            'returns_refund_commission_percentage': float(returns_refund_commission_percentage)
        })
        
@app.route('/operating_expenses_items_breakdown_trend_chart', methods=['GET'])
def get_operating_expenses_items_breakdown_trend_chart():
    
    # Get parameters from the request
    as_of_date = request.args.get('dateUpTo')
    period_display = request.args.get('displayMode', 'month')
    brand = request.args.get('brand')
    ir = request.args.get('ir')
    sku = request.args.get('sku')

    # If brand, ir, or sku are empty strings, set them to None
    if brand == '':
        brand = None
    if ir == '':
        ir = None
    if sku == '':
        sku = None
    
    # If as_of_date is not provided, get the latest date
    if not as_of_date:
        query = """
        select max(purchase_date_pst_pdt)
        from allorderspnl
        """
        latest_date_result = db.session.execute(text(query)).fetchone()
        if not latest_date_result or latest_date_result[0] is None:
            return jsonify({'error': 'No Orders data found'}), 404
        else:
            as_of_date = latest_date_result[0]
            as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d %H:%M:%S.%f')
    else:
        as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d')
        as_of_date = as_of_date.replace(hour=23, minute=59, second=59)
    
    # get operating expenses breakdown since beginning
    OpExpenses_detailed_item_since_beginning = get_operating_expenses_detailed_items_breakdown_since_beginning(as_of_date)
    negate_cols = [col for col in OpExpenses_detailed_item_since_beginning.columns if col not in ['data_month_last_day', 'sales_status', 'sku', 'total_revenue']]
    OpExpenses_detailed_item_since_beginning[negate_cols] = OpExpenses_detailed_item_since_beginning[negate_cols] * -1
    OpExpenses_detailed_item_since_beginning['advertisements_non_sales'] = np.where(
        OpExpenses_detailed_item_since_beginning['sales_status'] == 'Non-Sales', 
        OpExpenses_detailed_item_since_beginning['operating_expenses_advertisements'], 
        0)
    OpExpenses_detailed_item_since_beginning['advertisements_sales'] = np.where(
        OpExpenses_detailed_item_since_beginning['sales_status'] == 'Sales', 
        OpExpenses_detailed_item_since_beginning['operating_expenses_advertisements'], 
        0)

    # Step 1: Ensure datetime and create base time columns
    OpExpenses_detailed_item_since_beginning['data_month_last_day'] = pd.to_datetime(OpExpenses_detailed_item_since_beginning['data_month_last_day'])

    # Create period columns
    OpExpenses_detailed_item_since_beginning['month'] = OpExpenses_detailed_item_since_beginning['data_month_last_day'].dt.strftime("%b'%y")
    OpExpenses_detailed_item_since_beginning['quarter'] = OpExpenses_detailed_item_since_beginning['data_month_last_day'].apply(lambda x: f"Q{((x.month - 1) // 3 + 1)}'{str(x.year)[-2:]}")
    OpExpenses_detailed_item_since_beginning['year'] = OpExpenses_detailed_item_since_beginning['data_month_last_day'].dt.strftime("%Y")

    # Create period sort key (used after groupby) and Generate full period list to join with filtered data later on to preserve missing periods
    # 1. Determine date range
    start_date = OpExpenses_detailed_item_since_beginning['data_month_last_day'].min()
    end_date = OpExpenses_detailed_item_since_beginning['data_month_last_day'].max()
    # 2. Extend the end date to include full period
    if period_display == 'month':
        end_date = end_date + pd.offsets.MonthEnd(0)
    elif period_display == 'quarter':
        end_date = end_date + pd.offsets.QuarterEnd(0)
    elif period_display == 'year':
        end_date = end_date + pd.offsets.YearEnd(0)
    # 3. Build full canonical period list with period and sort key
    if period_display == 'month':
        all_periods = pd.date_range(start=start_date, end=end_date, freq='M')
        period_sort_df = pd.DataFrame({
            'period_sort_key': all_periods,
            'period': all_periods.strftime("%b'%y")
        })
    elif period_display == 'quarter':
        all_periods = pd.date_range(start=start_date, end=end_date, freq='Q')
        period_sort_df = pd.DataFrame({
            'period_sort_key': all_periods,
            'period': all_periods.to_series().apply(lambda x: f"Q{((x.month - 1) // 3 + 1)}'{str(x.year)[-2:]}")
        })
    elif period_display == 'year':
        all_periods = pd.date_range(start=start_date, end=end_date, freq='Y')
        period_sort_df = pd.DataFrame({
            'period_sort_key': all_periods,
            'period': all_periods.strftime("%Y")
        })

    OpExpenses_detailed_item_since_beginning['brand'] = OpExpenses_detailed_item_since_beginning['sku'].apply(lambda s: s.split('_', 1)[0] if isinstance(s, str) else None)
    OpExpenses_detailed_item_since_beginning['main_component'] = OpExpenses_detailed_item_since_beginning['sku'].apply(
            lambda s: s.split('_', 1)[-1].split('_', 1)[0] if isinstance(s, str) and '_' in s else None
        )
    if brand is not None:
        OpExpenses_detailed_item_since_beginning = OpExpenses_detailed_item_since_beginning[OpExpenses_detailed_item_since_beginning['brand'] == brand]
    if ir is not None:
        OpExpenses_detailed_item_since_beginning = OpExpenses_detailed_item_since_beginning[OpExpenses_detailed_item_since_beginning['main_component'] == ir]
    if sku is not None:
        OpExpenses_detailed_item_since_beginning = OpExpenses_detailed_item_since_beginning[OpExpenses_detailed_item_since_beginning['sku'] == sku]

    agg_df = OpExpenses_detailed_item_since_beginning.groupby(period_display).agg({
            'total_revenue': 'sum',

            'operating_expenses_commission': 'sum',

            'operating_expenses_advertisements': 'sum',
            'advertisements_sales': 'sum',
            'advertisements_non_sales': 'sum',

            'operating_expenses_promotions': 'sum',

            'operating_expenses_FBA_fees': 'sum', 
            'FBA_fulfillment_fee': 'sum', 
            'FBA_inbound_transportation_fee': 'sum', 
            'FBA_storage_fee': 'sum',

            'operating_expenses_FBM_fees': 'sum',

            'operating_expenses_FBM_shipping': 'sum',

            'operating_expenses_service_fees': 'sum', 
            'sales_tax_service_fee': 'sum', 
            'digital_services_fee': 'sum', 
            'subscription_fee': 'sum',

            'operating_expenses_marketplace_facilitator_tax': 'sum',

            'operating_expenses_revenue_chargebacks': 'sum',

            'operating_expenses_returns': 'sum', 
            'returns_shipping_gift_wrap': 'sum', 
            'returns_tax': 'sum', 
            'returns_refund_commission': 'sum'
        }).reset_index().rename(columns={period_display: 'period'})
    
    agg_df['commission'] = agg_df['operating_expenses_commission']
    agg_df['promotions'] = agg_df['operating_expenses_promotions']
    agg_df['FBM_fees'] = agg_df['operating_expenses_FBM_fees']
    agg_df['FBM_shipping'] = agg_df['operating_expenses_FBM_shipping']
    agg_df['marketplace_facilitator_tax'] = agg_df['operating_expenses_marketplace_facilitator_tax']
    agg_df['revenue_chargebacks'] = agg_df['operating_expenses_revenue_chargebacks']
    
    # Join with full period list to preserve missing periods
    agg_df = pd.merge(
        period_sort_df, 
        agg_df, 
        left_on=['period'], 
        right_on=['period'], 
        how='left'
    )

    # Fill NA with 0 for numeric columns
    numeric_cols = [col for col in agg_df.columns if col not in ['period', 'period_sort_key']]
    agg_df[numeric_cols] = agg_df[numeric_cols].fillna(0)

    # Calculate Operating Expenses Specific Item / Revenue %
    agg_df['Commission / Revenue %'] = agg_df.apply(lambda row: (row['operating_expenses_commission'] / row['total_revenue'] * 100) if row['total_revenue'] else 0, axis=1)
    agg_df['Commission / Revenue %'] = agg_df['Commission / Revenue %'].round(1)

    agg_df['Promotions / Revenue %'] = agg_df.apply(lambda row: (row['operating_expenses_promotions'] / row['total_revenue'] * 100) if row['total_revenue'] else 0, axis=1)
    agg_df['Promotions / Revenue %'] = agg_df['Promotions / Revenue %'].round(1)

    agg_df['advertisements / Revenue %'] = agg_df.apply(lambda row: (row['operating_expenses_advertisements'] / row['total_revenue'] * 100) if row['total_revenue'] else 0, axis=1)
    agg_df['advertisements / Revenue %'] = agg_df['advertisements / Revenue %'].round(1)

    agg_df['FBA Fees / Revenue %'] = agg_df.apply(lambda row: (row['operating_expenses_FBA_fees'] / row['total_revenue'] * 100) if row['total_revenue'] else 0, axis=1)
    agg_df['FBA Fees / Revenue %'] = agg_df['FBA Fees / Revenue %'].round(1)

    agg_df['FBM Fees / Revenue %'] = agg_df.apply(lambda row: (row['operating_expenses_FBM_fees'] / row['total_revenue'] * 100) if row['total_revenue'] else 0, axis=1)
    agg_df['FBM Fees / Revenue %'] = agg_df['FBM Fees / Revenue %'].round(1)

    agg_df['FBM Shipping / Revenue %'] = agg_df.apply(lambda row: (row['operating_expenses_FBM_shipping'] / row['total_revenue'] * 100) if row['total_revenue'] else 0, axis=1)
    agg_df['FBM Shipping / Revenue %'] = agg_df['FBM Shipping / Revenue %'].round(1)

    agg_df['Service Fees / Revenue %'] = agg_df.apply(lambda row: (row['operating_expenses_service_fees'] / row['total_revenue'] * 100) if row['total_revenue'] else 0, axis=1)
    agg_df['Service Fees / Revenue %'] = agg_df['Service Fees / Revenue %'].round(1)

    agg_df['MP Facilitator Tax / Revenue %'] = agg_df.apply(lambda row: (row['operating_expenses_marketplace_facilitator_tax'] / row['total_revenue'] * 100) if row['total_revenue'] else 0, axis=1)
    agg_df['MP Facilitator Tax / Revenue %'] = agg_df['MP Facilitator Tax / Revenue %'].round(1)

    agg_df['Revenue Chargebacks / Revenue %'] = agg_df.apply(lambda row: (row['operating_expenses_revenue_chargebacks'] / row['total_revenue'] * 100) if row['total_revenue'] else 0, axis=1)
    agg_df['Revenue Chargebacks / Revenue %'] = agg_df['Revenue Chargebacks / Revenue %'].round(1)
    
    agg_df['Returns / Revenue %'] = agg_df.apply(lambda row: (row['operating_expenses_returns'] / row['total_revenue'] * 100) if row['total_revenue'] else 0, axis=1)
    agg_df['Returns / Revenue %'] = agg_df['Returns / Revenue %'].round(1)

    expense_item_selection = request.args.get('fullExpenseItem')
    if expense_item_selection == 'commission':
        agg_df = agg_df[['period', 'period_sort_key', 'total_revenue', 'operating_expenses_commission', 'commission', 'Commission / Revenue %']]
    elif expense_item_selection == 'promotions':
        agg_df = agg_df[['period', 'period_sort_key', 'total_revenue', 'operating_expenses_promotions', 'promotions','Promotions / Revenue %']]
    elif expense_item_selection == 'advertisements':
        agg_df = agg_df[['period', 'period_sort_key', 'total_revenue', 'operating_expenses_advertisements', 'advertisements_sales', 'advertisements_non_sales', 'advertisements / Revenue %']]
    elif expense_item_selection == 'fba_fees':
        agg_df = agg_df[['period', 'period_sort_key', 'total_revenue', 'operating_expenses_FBA_fees', 'FBA_fulfillment_fee', 'FBA_inbound_transportation_fee', 'FBA_storage_fee', 'FBA Fees / Revenue %']]
    elif expense_item_selection == 'fbm_fees':
        agg_df = agg_df[['period', 'period_sort_key', 'total_revenue', 'operating_expenses_FBM_fees', 'FBM_fees', 'FBM Fees / Revenue %']]
    elif expense_item_selection == 'fbm_shipping':
        agg_df = agg_df[['period', 'period_sort_key', 'total_revenue', 'operating_expenses_FBM_shipping', 'FBM_shipping', 'FBM Shipping / Revenue %']]
    elif expense_item_selection == 'service_fees':
        agg_df = agg_df[['period', 'period_sort_key', 'total_revenue', 'operating_expenses_service_fees', 'sales_tax_service_fee', 'digital_services_fee', 'subscription_fee', 'Service Fees / Revenue %']]
    elif expense_item_selection == 'marketplace_facilitator_tax':
        agg_df = agg_df[['period', 'period_sort_key', 'total_revenue', 'operating_expenses_marketplace_facilitator_tax', 'marketplace_facilitator_tax','MP Facilitator Tax / Revenue %']]
    elif expense_item_selection == 'chargebacks':
        agg_df = agg_df[['period', 'period_sort_key', 'total_revenue', 'operating_expenses_revenue_chargebacks', 'revenue_chargebacks','Revenue Chargebacks / Revenue %']]
    elif expense_item_selection == 'returns':
        agg_df = agg_df[['period', 'period_sort_key', 'total_revenue', 'operating_expenses_returns', 'returns_shipping_gift_wrap', 'returns_tax', 'returns_refund_commission', 'Returns / Revenue %']]
    
    agg_df.sort_values(by=['period_sort_key'], inplace=True)

    # Drop sort key and convert to records
    final_df = agg_df.drop(columns=['period_sort_key'])

    return jsonify(final_df.to_dict(orient='records'))

#-------------------------------------------------------------------------------------------------
# Report CRUD                                                                          |
#-------------------------------------------------------------------------------------------------
@app.route('/pnl_report_data', methods=['GET'])
def get_pnl_report_data():
    try:
        # Get filter parameters
        portfolio = request.args.get('portfolio', '')
        product = request.args.get('product', '')
        sku = request.args.get('sku', '')
        start_date = request.args.get('startDate', '')
        end_date = request.args.get('endDate', '')
        
        # Get raw data from the function
        raw_data = get_pnl_report_by_day()
        
        # Import re for brand/product extraction
        import re
        
        # Helper functions to extract brand and main_component
        def extract_brand(sku_val):
            if not isinstance(sku_val, str):
                return None
            match = re.match(r'^([a-zA-Z]+)', sku_val)
            return match.group(1) if match else None
        
        def extract_main_component(sku_val):
            if not isinstance(sku_val, str):
                return None
            brand_match = re.match(r'^([a-zA-Z]+)', sku_val)
            if not brand_match:
                return None
            
            brand = brand_match.group(1)
            remaining = sku_val[len(brand):]
            number_match = re.match(r'^(\d+)', remaining)
            
            if number_match:
                return brand + number_match.group(1)
            else:
                return brand
        
        # Add brand and main_component columns for filtering
        raw_data['brand'] = raw_data['sku'].apply(extract_brand)
        raw_data['main_component'] = raw_data['sku'].apply(extract_main_component)
        
        # Filter data by Portfolio (brand) if provided
        if portfolio:
            raw_data = raw_data[raw_data['brand'] == portfolio]
        
        # Filter data by Product (main_component) if provided
        if product:
            raw_data = raw_data[raw_data['main_component'] == product]
        
        # Filter data by SKU if provided
        if sku:
            raw_data = raw_data[raw_data['sku'] == sku]
        
        # Convert date_by_day to datetime BEFORE filtering to ensure proper comparison
        raw_data['date_by_day'] = pd.to_datetime(raw_data['date_by_day'])
        
        # Filter data by date range if provided (frontend sends YYYY-MM-DD strings)
        if start_date:
            start_date_dt = pd.to_datetime(start_date)
            raw_data = raw_data[raw_data['date_by_day'] >= start_date_dt]
        if end_date:
            end_date_dt = pd.to_datetime(end_date)
            raw_data = raw_data[raw_data['date_by_day'] <= end_date_dt]
            
        # Check if we have data after filtering
        if raw_data.empty:
            return jsonify({
                'error': 'No data available for the selected filters',
                'status': 'error'
            }), 404
        

        # Convert all numeric columns from decimal to float FIRST
        expected_numeric_cols = [
            'quantity', 'total_revenue', 'revenue_principal', 'revenue_shipping', 'revenue_tax', 
            'revenue_returns', 'revenue_other', 'total_COGS', 'gross_margin', 'total_operating_expenses',
            'operating_expenses_commission', 'operating_expenses_advertisements', 'operating_expenses_promotions',
            'operating_expenses_FBM_shipping_cost', 'operating_expenses_FBM_warehouse_cost',
            'operating_expenses_FBA_fees', 'FBA_fulfillment_fee', 'FBA_storage_fee',
            'operating_expenses_service_fees', 'operating_expenses_marketplace_facilitator_tax',
            'operating_expenses_revenue_chargebacks', 'operating_expenses_returns',
            'returns_shipping_gift_wrap', 'returns_tax', 'returns_refund_commission', 'net_profit'
        ]
        
        # Convert existing columns to float
        for col in expected_numeric_cols:
            if col in raw_data.columns:
                raw_data[col] = pd.to_numeric(raw_data[col], errors='coerce').astype(float)
        
        raw_data.drop(columns=['FBA_fulfillment_fee', 'FBA_storage_fee', 'returns_shipping_gift_wrap', 'returns_tax', 'returns_refund_commission'], inplace=True)
        
        raw_data['operating_expenses_FBA_and_service_fees'] = raw_data['operating_expenses_FBA_fees'].astype(float) + raw_data['operating_expenses_service_fees'].astype(float)
        raw_data['operating_expenses_FBM_shipping_and_almost_0_revenue_chargebacks'] = raw_data['operating_expenses_FBM_shipping_cost'].astype(float) + raw_data['operating_expenses_revenue_chargebacks'].astype(float)
        raw_data.drop(columns=['operating_expenses_FBA_fees', 'operating_expenses_service_fees', 'operating_expenses_FBM_shipping_cost', 'operating_expenses_revenue_chargebacks'], inplace=True)
        
        # Create week start and end dates
        # For Sunday start (weekday 6), we need to adjust back to the previous Sunday
        raw_data['week_start'] = raw_data['date_by_day'].apply(
            lambda x: x - pd.Timedelta(days=(x.weekday() + 1) % 7))
        raw_data['week_end'] = raw_data['week_start'] + pd.Timedelta(days=6)
        
        # Ensure the week_start doesn't exceed the actual start and end date in the dataset
        min_date = raw_data['date_by_day'].min()
        max_date = raw_data['date_by_day'].max()
        raw_data['week_start'] = raw_data['week_start'].apply(lambda x: max(x, min_date))
        raw_data['week_end'] = raw_data['week_end'].apply(lambda x: min(x, max_date))
        
        # Create a week label for grouping
        raw_data['week_label'] = raw_data['week_start'].dt.strftime('%Y-%m-%d') + ' to ' + raw_data['week_end'].dt.strftime('%Y-%m-%d')
        
        # Now select numeric columns (should work properly after float conversion)
        numeric_columns = raw_data.select_dtypes(include=['number']).columns.tolist()
        print("Selected numeric columns after conversion:")
        print(numeric_columns)
        
        # Make sure 'week_label' is included for grouping
        agg_columns = ['week_label'] + [col for col in numeric_columns if col not in ['week_start', 'week_end']]
        
        # Group by week and sum the metrics
        weekly_data = raw_data[agg_columns].groupby('week_label').sum().reset_index()
        
        # Sort by week_label which should sort chronologically
        weekly_data = weekly_data.sort_values('week_label')
        
        # Get all unique week labels for our columns
        unique_weeks = weekly_data['week_label'].unique().tolist()
        
        # Define the metrics we want to display and their display names
        metrics_map = {
            'quantity': 'Sales Volume',
            'total_revenue': 'Total Revenue',
            'revenue_principal': 'Principal Revenue',
            'revenue_shipping': 'Shipping Revenue',
            'revenue_tax': 'Tax Revenue',
            'revenue_returns': 'Returns Revenue',
            'revenue_other': 'Other Revenue',
            'total_COGS': 'Total COGS',
            'gross_margin': 'Gross Margin',
            'total_operating_expenses': 'Total Operating Expenses',
            'operating_expenses_commission': 'Commission',
            'operating_expenses_advertisements': 'Advertisements',
            'operating_expenses_promotions': 'Promotions',
            
            'operating_expenses_FBM_shipping_and_almost_0_revenue_chargebacks': 'FBM Shipping',
            'operating_expenses_FBM_warehouse_cost': 'FBM Warehouse Cost',

            'operating_expenses_marketplace_facilitator_tax': 'MP Facilitator Tax',
            'operating_expenses_FBA_and_service_fees': 'Amazon Shipping Labels & Other Fees',
            'operating_expenses_returns': 'Returns',
            'net_profit': 'Net Profit'
        }
        
        # Create result table structure
        result_table = {
            'metrics': list(metrics_map.values()),  # Display names for the metrics
            'period_str': f"Weekly Period",
            'as_of_date': datetime.now().strftime('%Y-%m-%d'),
            'dates': unique_weeks,  # Column headers are now week ranges
            'data': {},  # Will hold our data values
            'percentage_of_revenue': {}  # Will hold our percentage calculations
        }
        
        # Fill in data for each week column
        for week in unique_weeks:
            week_data = weekly_data[weekly_data['week_label'] == week]
            
            # Initialize data for this week
            result_table['data'][week] = []
            result_table['percentage_of_revenue'][week] = []
            
            # Get the total revenue for percentage calculations
            if not week_data.empty and 'total_revenue' in week_data.columns:
                total_revenue = float(week_data['total_revenue'].iloc[0])
            else:
                total_revenue = 0
            
            # Fill in values for each metric
            for metric in metrics_map.keys():
                if not week_data.empty and metric in week_data.columns:
                    metric_value = week_data[metric].iloc[0]
                    # Convert decimal to float if needed
                    if hasattr(metric_value, 'astype'):
                        metric_value = float(metric_value)
                    elif str(type(metric_value)).find('Decimal') != -1:
                        metric_value = float(metric_value)
                else:
                    metric_value = 0
                    
                result_table['data'][week].append(int(metric_value) if metric == 'quantity' else float(metric_value))
                
                # Calculate percentage of revenue
                percentage = (float(metric_value) / float(total_revenue)) * 100 if total_revenue > 0 else 0
                result_table['percentage_of_revenue'][week].append(float(percentage) if metric != 'quantity' else 0.0)
        
        # Calculate totals across all weeks
        result_table['totals'] = []
        result_table['totals_percentage_of_revenue'] = []
        
        # Get sum of total revenue for overall percentage calculations
        total_revenue_all = float(sum(weekly_data['total_revenue'])) if 'total_revenue' in weekly_data.columns else 0
        
        # Calculate totals for each metric
        for metric in metrics_map.keys():
            if metric in weekly_data.columns:
                metric_total = float(sum(weekly_data[metric]))
            else:
                metric_total = 0
            result_table['totals'].append(int(metric_total) if metric == 'quantity' else float(metric_total))
            
            # Calculate percentage of total revenue
            percentage = (float(metric_total) / float(total_revenue_all)) * 100 if total_revenue_all > 0 else 0
            result_table['totals_percentage_of_revenue'].append(float(percentage) if metric != 'quantity' else 0.0)
        
        return jsonify(result_table)
        
    except Exception as e:
        app.logger.error(f"Error in get_pnl_report_data: {str(e)}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

# Get unique week labels for profitability report filter
@app.route('/profitability_report_weeks', methods=['GET'])
def get_profitability_report_weeks():
    try:
        raw_data = get_profitability_report_by_week_and_sku()
        
        if raw_data.empty:
            return jsonify({
                'error': 'No profitability data available',
                'status': 'error'
            }), 404
        
        # Get unique week labels, sorted
        unique_weeks = sorted(raw_data['week_label'].unique().tolist())
        
        return jsonify({
            'weeks': unique_weeks,
            'status': 'success'
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Failed to fetch week labels: {str(e)}',
            'status': 'error'
        }), 500

@app.route('/profitability_report_data', methods=['GET'])
def get_profitability_report_data():
    try:
        # Get filter parameters - can be multiple weeks separated by comma
        performance_weeks_param = request.args.get('performanceWeeks', '')
        
        # Get raw data
        raw_data = get_profitability_report_by_week_and_sku()
        
        if raw_data.empty:
            return jsonify({
                'error': 'No profitability data available',
                'status': 'error'
            }), 404
        
        # Parse performance weeks
        if performance_weeks_param:
            performance_weeks = [week.strip() for week in performance_weeks_param.split(',') if week.strip()]
        else:
            # If no performance weeks provided, use the latest week
            unique_weeks = sorted(raw_data['week_label'].unique().tolist())
            if unique_weeks:
                performance_weeks = [unique_weeks[-1]]  # Latest week
            else:
                performance_weeks = []
        
        # Filter by performance weeks
        if performance_weeks:
            raw_data = raw_data[raw_data['week_label'].isin(performance_weeks)]
            
            if raw_data.empty:
                return jsonify({
                    'error': f'No data available for selected weeks: {", ".join(performance_weeks)}',
                    'status': 'error'
                }), 404
        
        # Aggregate data by SKU (sum net_profit and total_revenue across selected weeks)
        aggregated_data = raw_data.groupby('sku').agg({
            'net_profit': 'sum',
            'total_revenue': 'sum'
        }).reset_index()
        
        # Recalculate net_profit_percentage with proper float conversion
        aggregated_data['net_profit_percentage'] = aggregated_data.apply(
            lambda row: (float(row['net_profit']) / float(row['total_revenue']) * 100) if row['total_revenue'] != 0 else 0.0, 
            axis=1
        )
        
        # Prepare the 4 sets of data using aggregated data
        
        # Set 1: SKU + Net Profit (sorted by net profit descending)
        set1 = aggregated_data[['sku', 'net_profit']].copy()
        set1 = set1.sort_values('net_profit', ascending=False)
        set1_data = [
            {'sku': row['sku'], 'net_profit': row['net_profit']}
            for _, row in set1.iterrows()
        ]
        
        # Set 2: SKU + Net Profit Percentage (sorted by net profit percentage descending)
        set2 = aggregated_data[['sku', 'net_profit_percentage']].copy()
        set2 = set2.sort_values('net_profit_percentage', ascending=False)
        set2_data = [
            {'sku': row['sku'], 'net_profit_percentage': row['net_profit_percentage']}
            for _, row in set2.iterrows()
        ]
        
        # Set 3: SKU + Total Revenue (sorted by total revenue descending)
        set3 = aggregated_data[['sku', 'total_revenue']].copy()
        set3 = set3.sort_values('total_revenue', ascending=False)
        set3_data = [
            {'sku': row['sku'], 'total_revenue': row['total_revenue']}
            for _, row in set3.iterrows()
        ]
        
        # Set 4: SKU + Rankings
        # Calculate individual rankings with proper float conversion
        aggregated_data_ranked = aggregated_data.copy()
        aggregated_data_ranked['net_profit_rank'] = aggregated_data_ranked['net_profit'].astype(float).rank(ascending=False, method='min').astype(int)
        aggregated_data_ranked['net_profit_percentage_rank'] = aggregated_data_ranked['net_profit_percentage'].astype(float).rank(ascending=False, method='min').astype(int)
        aggregated_data_ranked['total_revenue_rank'] = aggregated_data_ranked['total_revenue'].astype(float).rank(ascending=False, method='min').astype(int)
        
        # Calculate overall rank (sum of 3 ranks, lower is better)
        aggregated_data_ranked['rank_sum'] = (
            aggregated_data_ranked['net_profit_rank'] + 
            aggregated_data_ranked['net_profit_percentage_rank'] + 
            aggregated_data_ranked['total_revenue_rank']
        )
        aggregated_data_ranked['overall_rank'] = aggregated_data_ranked['rank_sum'].rank(ascending=True, method='min').astype(int)
        
        # Sort by overall rank
        set4 = aggregated_data_ranked.sort_values('overall_rank')
        set4_data = [
            {
                'sku': row['sku'],
                'net_profit_rank': row['net_profit_rank'],
                'net_profit_percentage_rank': row['net_profit_percentage_rank'],
                'total_revenue_rank': row['total_revenue_rank'],
                'overall_rank': row['overall_rank']
            }
            for _, row in set4.iterrows()
        ]
        
        # Create a display label for the selected weeks
        week_display = ', '.join(performance_weeks) if len(performance_weeks) <= 3 else f'{len(performance_weeks)} weeks selected'
        
        return jsonify({
            'performance_weeks': performance_weeks,
            'performance_week_display': week_display,
            'net_profit_data': set1_data,
            'net_profit_percentage_data': set2_data,
            'total_revenue_data': set3_data,
            'ranking_data': set4_data,
            'status': 'success'
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Failed to fetch profitability report data: {str(e)}',
            'status': 'error'
        }), 500

@app.route('/returns_report_data', methods=['GET'])
def get_returns_report_data():
    try:
        # Get filter parameters
        sku = request.args.get('sku', '')
        start_date = request.args.get('startDate', '')
        end_date = request.args.get('endDate', '')
        
        # Get raw data from the function
        raw_data = get_returns_report_by_day()
        raw_data = raw_data[
            abs(raw_data['returned_expenses'].astype(float) + raw_data['returned_revenue_and_return_comission'].astype(float)) >= 0.1
        ]
        
        # Filter data by SKU if provided
        if sku:
            raw_data = raw_data[raw_data['sku'] == sku]
        
        # Filter data by date range if provided
        if start_date:
            raw_data = raw_data[raw_data['date_by_day'] >= start_date]
        if end_date:
            raw_data = raw_data[raw_data['date_by_day'] <= end_date]
            
        # Check if we have data after filtering
        if raw_data.empty:
            return jsonify({
                'error': 'No data available for the selected filters',
                'status': 'error'
            }), 404
        
        # Sort data by date
        raw_data = raw_data.groupby(['date_by_day']).sum().reset_index()
        raw_data = raw_data.sort_values('date_by_day')
        
        # Get all unique dates for our columns and convert to strings
        unique_dates = raw_data['date_by_day'].unique().tolist()
        
        # Simple date format conversion - convert each date to a string
        unique_date_strings = []
        for date_val in unique_dates:
            if pd.notna(date_val):
                # Try to convert to datetime if it's not already
                try:
                    if not isinstance(date_val, datetime) and not isinstance(date_val, date):
                        date_val = pd.to_datetime(date_val)
                    # Format as string
                    date_string = date_val.strftime('%Y-%m-%d') if hasattr(date_val, 'strftime') else str(date_val)
                except:
                    date_string = str(date_val)
            else:
                date_string = ""
            unique_date_strings.append(date_string)
        
        # Define the metrics we want to display and their display names
        metrics_map = {
            'quantity': 'Sales Volume',
            'total_order_only_profit': 'Order Related Profit',
            'total_order_only_revenue': 'Order Related Revenue',
            'total_order_only_expenses': 'Order Related Expenses',
            'principal_revenue': 'Order Principal Revenue',

            'returned_revenue_and_return_comission': 'Revenue Reversal and Returns Comission',
            'returns_principal_revenue_reversal': 'Principal Revenue Reversal',
            'returns_shipping_gift_wrap_revenue_reversal': 'Shipping & Gift-Wrap Revenue Reversal',
            'returns_tax_reversal': 'Tax Revenue Reversal',
            'returns_commission': 'Returns Commission',

            'returned_expenses': 'Returned Expenses',
            'returns_non_principal_chargebacks': 'Non-Principal Chargebacks',
            'returns_promotion_discounts_reversal': 'Promotion Discounts Reversal',
            'returns_commission_reversal': 'Commission Reversal',
            'returns_marketplace_facilitator_tax_reversal': 'Marketplace Facilitator Tax Reversal',
            'returns_other_reversal': 'Other Reversal',

            'net': 'Net Position from Returns'
        }
        
        # Create result table structure
        result_table = {
            'metrics': list(metrics_map.values()),  # Display names for the metrics
            'period_str': f"Period",
            'as_of_date': datetime.now().strftime('%Y-%m-%d'),
            'dates': unique_date_strings,  # Column headers for dates as strings
            'data': {},  # Will hold our data values
        }
        
        # Fill in data for each date column
        for i, date in enumerate(unique_dates):
            date_str = unique_date_strings[i]  # Use string version for dictionary key
            date_data = raw_data[raw_data['date_by_day'] == date]
            
            # Initialize data for this date
            result_table['data'][date_str] = []
            
            # Fill in values for each metric
            for metric in metrics_map.keys():
                metric_value = date_data[metric].iloc[0] if not date_data.empty and metric in date_data.columns else 0
                result_table['data'][date_str].append(int(metric_value) if metric == 'quantity' else float(metric_value))
                
        
        # Calculate totals across all dates
        result_table['totals'] = []
        
        # Calculate totals for each metric
        for metric in metrics_map.keys():
            metric_total = sum(raw_data[metric]) if metric in raw_data.columns else 0
            result_table['totals'].append(int(metric_total) if metric == 'quantity' else float(metric_total))
        
        return jsonify(result_table)
        
    except Exception as e:
        app.logger.error(f"Error in get_pnl_report_data: {str(e)}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500
    

#-------------------------------------------------------------------------------------------------
# Evaluate Strategy CRUD                                                                          |
#-------------------------------------------------------------------------------------------------
@app.route('/evaluate_strategy/revenue_oriented_forecast_line_table_data', methods=['GET'])
def get_evaluate_strategy_revenue_oriented_forecast_line_table_data():

    # Get parameters from the request
    as_of_date = request.args.get('dateUpTo')
    brand = request.args.get('brand')
    ir = request.args.get('ir')
    sku = request.args.get('sku')

    # Get forecast parameters
    forecast_revenue_method = request.args.get('forecast_revenue_method')
    forecast_DSI_method = request.args.get('forecast_DSI_method')
    DSI_period_in_days = request.args.get('DSI_period_in_days')

    if forecast_revenue_method == 'target_revenue':
        year_end_total_revenue_target = request.args.get('year_end_total_revenue_target')
        if year_end_total_revenue_target == '':
            return jsonify({'error': 'Year end total revenue target is required'}), 400
        else:
            # Convert to float for calculations
            year_end_total_revenue_target = float(year_end_total_revenue_target)
    elif forecast_revenue_method == 'flat_growth':
        input_growth_rate = request.args.get('input_growth_rate')
        if input_growth_rate == '':
            input_growth_rate = 0
        else:
            # Convert to float before dividing
            input_growth_rate = float(input_growth_rate) / 100
    
    if forecast_DSI_method == 'target_DSI':
        year_end_DSI_target = request.args.get('year_end_DSI_target')
        if year_end_DSI_target == '':
            return jsonify({'error': 'Year end total DSI target is required'}), 400
        else:
            # Convert to float for calculations
            year_end_DSI_target = float(year_end_DSI_target)
    elif forecast_DSI_method == 'flat_change':
        input_DSI_change_rate = request.args.get('input_DSI_change_rate')
        if input_DSI_change_rate == '':
            input_DSI_change_rate = 0
        else:
            # Convert to float before dividing
            input_DSI_change_rate = float(input_DSI_change_rate) / 100
    
    # Convert DSI_period_in_days to integer if present
    if DSI_period_in_days:
        DSI_period_in_days = int(DSI_period_in_days)
    else:
        DSI_period_in_days = 30
    
    # If brand, ir, or sku are empty strings, set them to None
    if brand == '':
        brand = None
    if ir == '':
        ir = None
    if sku == '':
        sku = None

    # If as_of_date is not provided, get the latest date
    if not as_of_date:
        query = """
        select max(purchase_date_pst_pdt)
        from allorderspnl
        """
        latest_date_result = db.session.execute(text(query)).fetchone()
        if not latest_date_result or latest_date_result[0] is None:
            return jsonify({'error': 'No Orders data found'}), 404
        else:
            as_of_date = latest_date_result[0]
            as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d %H:%M:%S.%f')
    else:
        as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d')
        as_of_date = as_of_date.replace(hour=23, minute=59, second=59)
    
    # get revenue, cogs, operating expenses
    forecast_metrics = get_revenue_cogs_operating_expenses_by_period_since_beginning(as_of_date, 'month')
    forecast_metrics['data_month_last_day'] =pd.to_datetime(forecast_metrics['data_month_last_day'])

    # get DSI
    unique_months = forecast_metrics['data_month_last_day'].unique()
    dsi_result_df = []
    for month in unique_months:
        dsi = get_DSI(month, DSI_period_in_days)
        dsi['avg_inventory'] = dsi['DSI'] / DSI_period_in_days * dsi['COGS']
        dsi['data_month_last_day'] = month
        dsi_result_df.append(dsi)
    dsi_result_df = pd.concat(dsi_result_df)
    dsi_result_df.drop(columns=['DSI','inventory_start_value','inventory_end_value'], inplace=True)
    dsi_result_df.rename(columns={'COGS':'DSI_COGS'}, inplace=True)
    forecast_metrics = pd.merge(
        forecast_metrics, 
        dsi_result_df, 
        left_on=['data_month_last_day', 'sku'], 
        right_on=['data_month_last_day', 'SKU'], 
        how='left'
    )
    forecast_metrics.drop(columns=['SKU'], inplace=True)

    # get procurement AP (first generate full SKU list for all months, then join with cumulative procurement cost)
    forecast_metrics['sku'] = forecast_metrics['sku'].fillna('NonSKU_NonSKU_NonSKU')
    min_month = forecast_metrics['data_month_last_day'].min()
    max_month = as_of_date + pd.offsets.MonthEnd(0)
    all_months = pd.date_range(
        start=min_month,
        end=max_month,
        freq='ME'
    )
    all_skus = forecast_metrics['sku'].unique()
    full_index = pd.MultiIndex.from_product(
        [all_months, all_skus],
        names=['data_month_last_day', 'sku']
    )
    full_grid = pd.DataFrame(index=full_index).reset_index()
    forecast_metrics = pd.merge(
        full_grid,
        forecast_metrics,
        on=['data_month_last_day', 'sku'],
        how='left'
    )
    forecast_metrics['sku'] = forecast_metrics['sku'].replace('NonSKU_NonSKU_NonSKU', np.nan)
    forecast_metrics['brand'] = forecast_metrics['sku'].apply(lambda s: s.split('_', 1)[0] if isinstance(s, str) else None)
    forecast_metrics['main_component'] = forecast_metrics['sku'].apply(
        lambda s: s.split('_', 1)[-1].split('_', 1)[0] if isinstance(s, str) and '_' in s else None
    )

    procurement_AP_result = get_procurement_AP(as_of_date)

    forecast_metrics = pd.merge(
        forecast_metrics, 
        procurement_AP_result, 
        left_on=['data_month_last_day', 'main_component'], 
        right_on=['data_month_last_day', 'main_component'], 
        how='left'
    )
    forecast_metrics.drop(columns=['procurement_cost'], inplace=True)
    forecast_metrics['Indicator'] = 'Actuals'

    # Apply filters if provided
    if brand is not None:
        forecast_metrics = forecast_metrics[forecast_metrics['brand'] == brand]
    if ir is not None:
        forecast_metrics = forecast_metrics[forecast_metrics['main_component'] == ir]
    if sku is not None:
        forecast_metrics = forecast_metrics[forecast_metrics['sku'] == sku]

    ###################
    ###   actuals   ###
    ###################
    # revenue, cogs, operating expenses
    forecast_metrics_use = forecast_metrics.groupby(['Indicator','data_month_last_day'])[[
        'total_revenue',
        'COGS',
        'total_operating_expenses',
        'avg_inventory',
        'DSI_COGS'
    ]].sum()
    # forecast_metrics_use.to_csv('forecast_metrics_use.csv', index=False)

    # DSI   
    forecast_metrics_use['DSI'] = np.where(
        (forecast_metrics_use['DSI_COGS'] > 0) & (forecast_metrics_use['DSI_COGS'].notna()),
        forecast_metrics_use['avg_inventory'] / forecast_metrics_use['DSI_COGS'] * DSI_period_in_days,
        np.nan
    )
    forecast_metrics_use.drop(columns=['DSI_COGS'], inplace=True)
    # cumulative procurement cost - need to remove duplicate cumulative procurement cost for the same main_component (repeated due to left join with SKU)
    forecast_metrics['main_component_repeat_times_helper'] = forecast_metrics['data_month_last_day'].dt.strftime("%b'%y") + forecast_metrics['main_component'].fillna('missing')
    forecast_metrics['main_component_repeat_times']=forecast_metrics.groupby(['main_component_repeat_times_helper']).cumcount() + 1
    mask = (forecast_metrics['main_component_repeat_times'] == 1) | (forecast_metrics['main_component_repeat_times'].isna())
    forecast_metrics.loc[~mask, 'cumulative_procurement_cost'] = 0
    cumulative_procurement_cost_result = forecast_metrics.groupby(['Indicator','data_month_last_day'])['cumulative_procurement_cost'].sum()
    forecast_metrics_use = pd.merge(
        forecast_metrics_use, 
        cumulative_procurement_cost_result, 
        left_on=['Indicator','data_month_last_day'], 
        right_on=['Indicator','data_month_last_day'], 
        how='left')
    # cumulative procurement with payment (80% of monthly net profit)
    forecast_metrics_use['net_profit'] = forecast_metrics_use['total_revenue'] - forecast_metrics_use['COGS'] + forecast_metrics_use['total_operating_expenses']
    forecast_metrics_use['cumulative_net_profit'] = forecast_metrics_use['net_profit'].cumsum()
    forecast_metrics_use['cumulative_procurement_cost_with_payment'] = forecast_metrics_use['cumulative_procurement_cost'] - 0.8 * forecast_metrics_use['cumulative_net_profit']
    # AP (cumulative procurement with payment) to inventory ratio
    forecast_metrics_use['AP_to_inventory_ratio'] = forecast_metrics_use['cumulative_procurement_cost_with_payment'] / forecast_metrics_use['avg_inventory']
    # average COGS and Expense % to revenue for forecast
    average_cogs_to_revenue = forecast_metrics_use['COGS'].sum() / forecast_metrics_use['total_revenue'].sum()
    average_expense_to_revenue = forecast_metrics_use['total_operating_expenses'].sum() / forecast_metrics_use['total_revenue'].sum()
    forecast_metrics_use = forecast_metrics_use.reset_index()

    ###################
    ###   forecast  ###
    ###################
    # initialize forecast dataframe with month-end dates from next month to December same year
    max_month = forecast_metrics_use['data_month_last_day'].max()
    next_month_start = (max_month + pd.offsets.MonthBegin(1))
    month_ends = pd.date_range(
        start=next_month_start,
        end=pd.Timestamp(year=as_of_date.year, month=12, day=31),
        freq='M'  # month-end
    )
    forecast = pd.DataFrame({
        'Indicator': ['Forecast'] * len(month_ends),
        'data_month_last_day': month_ends
    })
    for col in forecast_metrics_use.columns:
        if col not in forecast.columns:
            forecast[col] = np.nan
    forecast_metrics_use = pd.concat(
        [forecast_metrics_use, forecast],
        axis=0,
        ignore_index=True  
    )
    forecast_metrics_use = forecast_metrics_use.sort_values(by=['Indicator','data_month_last_day'])
    forecast_metrics_use.reset_index()

    #--------------------------------
    # forecast revenue  & DSI        |
    #--------------------------------
    forecast_metrics_use['forecast_total_revenue'] = np.nan
    forecast_metrics_use['applied_growth_rate_revenue'] = np.nan

    forecast_metrics_use['forecast_DSI'] = np.nan
    forecast_metrics_use['applied_growth_rate_DSI'] = np.nan

    # Build reference data
    actuals_df = forecast_metrics_use[forecast_metrics_use['Indicator'] == 'Actuals']
    actual_revenue_by_month = dict(zip(actuals_df['data_month_last_day'], actuals_df['total_revenue']))
    actual_DSI_by_month = dict(zip(actuals_df['data_month_last_day'], actuals_df['DSI']))

    # Grab current year's revenue for forecast_revenue_method == 'target_revenue' scenario, calculat remaining revenue and months that need to solve for realize target
    current_year = as_of_date.year
    actuals_this_year = actuals_df[actuals_df['data_month_last_day'].dt.year == current_year]
    actual_months = len(actuals_this_year)
    actual_revenue_sum = actuals_this_year['total_revenue'].sum()
    latest_actual_revenue = actuals_df.sort_values('data_month_last_day')['total_revenue'].iloc[-1]
    if forecast_revenue_method == 'target_revenue':
        target_remaining = year_end_total_revenue_target - actual_revenue_sum
        months_remaining = 12 - actual_months
        def revenue_sum_equation(growth):
            return sum([latest_actual_revenue * (1 + growth)**i for i in range(1, months_remaining + 1)]) - target_remaining - 0.1
        try:
            result = root_scalar(revenue_sum_equation, method='brentq', bracket=[-1, 3.0])
            solved_growth = result.root
        except ValueError:
            solved_growth = 0

    # Grab latest DSI for forecast_DSI_method == 'target' scenario, calculat growth rate to achieve target
    latest_DSI_row = actuals_df[actuals_df['DSI'].notna()].sort_values('data_month_last_day').iloc[-1]
    latest_actual_DSI = latest_DSI_row['DSI']
    latest_DSI_month = latest_DSI_row['data_month_last_day']
    if forecast_DSI_method == 'target_DSI':
        months_remaining_to_year_end = 12 - latest_DSI_month.month
        solved_growth_DSI = (year_end_DSI_target / latest_actual_DSI) ** (1 / months_remaining_to_year_end) - 1

    # Loop over forecast rows
    last_forecasted_revenue = None # Track last revenue (first from actuals, then from forecast)
    last_forecasted_DSI = None # Track last DSI (first from actuals, then from forecast)
    for idx, row in forecast_metrics_use[forecast_metrics_use['Indicator'] == 'Forecast'].iterrows():
        curr_month = row['data_month_last_day']
        last_year = curr_month.year - 1

        this_month_last_year = curr_month.replace(year=last_year)
        prev_month_last_year = this_month_last_year - pd.offsets.MonthEnd(1)

        rev_this = actual_revenue_by_month.get(this_month_last_year)
        rev_prev = actual_revenue_by_month.get(prev_month_last_year)

        DSI_this = actual_DSI_by_month.get(this_month_last_year)
        DSI_prev = actual_DSI_by_month.get(prev_month_last_year)

        # Determine the base revenue (first from actuals, then from forecast)
        if last_forecasted_revenue is not None:
            base_revenue = last_forecasted_revenue
        else:
            base_revenue = latest_actual_revenue

        if last_forecasted_DSI is not None:
            base_DSI = last_forecasted_DSI
        else:
            base_DSI = latest_actual_DSI

        if forecast_revenue_method == 'benchmark':
            if rev_this is not None and rev_prev is not None and rev_this > 0 and rev_prev > 0:
                mom_growth = (rev_this - rev_prev) / rev_prev
            else:
                mom_growth = 0
        elif forecast_revenue_method == 'target_revenue':
            mom_growth = solved_growth
        elif forecast_revenue_method == 'flat_growth':
            mom_growth = input_growth_rate

        if forecast_DSI_method == 'benchmark':
            if DSI_this is not None and DSI_prev is not None and DSI_this > 0 and DSI_prev > 0:
                mom_DSI_growth = (DSI_this - DSI_prev) / DSI_prev
            else:
                mom_DSI_growth = 0
        elif forecast_DSI_method == 'target_DSI':
            mom_DSI_growth = solved_growth_DSI
        elif forecast_DSI_method == 'flat_change':
            mom_DSI_growth = input_DSI_change_rate

        # Calculate forecasted revenue
        if base_revenue is not None:
            forecast_value = base_revenue * (1 + mom_growth) if mom_growth is not None else base_revenue
            last_forecasted_revenue = forecast_value

            forecast_metrics_use.at[idx, 'forecast_total_revenue'] = forecast_value
            forecast_metrics_use.at[idx, 'applied_growth_rate_revenue'] = mom_growth
        
        if base_DSI is not None:
            forecast_value = base_DSI * (1 + mom_DSI_growth) if mom_DSI_growth is not None else base_DSI
            last_forecasted_DSI = forecast_value

            forecast_metrics_use.at[idx, 'forecast_DSI'] = forecast_value
            forecast_metrics_use.at[idx, 'applied_growth_rate_DSI'] = mom_DSI_growth

    #---------------------------------------------------------------------------------------------------------------------------------------------
    # forecast COGS, operating expenses, net profit, avg inventory, cumulative procurement cost, cumulative net profit, AP to inventory ratio     |
    #---------------------------------------------------------------------------------------------------------------------------------------------
    
    forecast_metrics_use['forecast_COGS'] = forecast_metrics_use['forecast_total_revenue'] * average_cogs_to_revenue
    forecast_metrics_use['forecast_operating_expenses'] = forecast_metrics_use['forecast_total_revenue'] * average_expense_to_revenue
    forecast_metrics_use['forecast_net_profit'] = forecast_metrics_use['forecast_total_revenue'] - forecast_metrics_use['forecast_COGS'] + forecast_metrics_use['forecast_operating_expenses']

    forecast_metrics_use['forecast_avg_inventory'] = forecast_metrics_use['forecast_DSI'] / DSI_period_in_days * forecast_metrics_use['forecast_COGS']

    latest_actual_cumulative_procurement_cost = actuals_df.sort_values('data_month_last_day')['cumulative_procurement_cost'].iloc[-1]
    latest_actual_avg_inventory = actuals_df.sort_values('data_month_last_day')['avg_inventory'].iloc[-1]
    last_forecasted_cumulative_procurement_cost = None
    forecast_metrics_use['forecast_cumulative_procurement_cost'] = np.nan

    latest_actual_cumulative_net_profit = actuals_df.sort_values('data_month_last_day')['cumulative_net_profit'].iloc[-1]
    last_forecasted_cumulative_net_profit = None
    forecast_metrics_use['forecast_cumulative_net_profit'] = np.nan

    for idx, row in forecast_metrics_use[forecast_metrics_use['Indicator'] == 'Forecast'].iterrows():
        if last_forecasted_cumulative_procurement_cost is not None:
            prev_avg_inventory = forecast_metrics_use.loc[idx - 1, 'forecast_avg_inventory']
            current_forecast_COGS = forecast_metrics_use.loc[idx, 'forecast_COGS']
            current_forecast_avg_inventory = forecast_metrics_use.loc[idx, 'forecast_avg_inventory']
            if prev_avg_inventory - current_forecast_COGS - current_forecast_avg_inventory < 0:
                forecast_metrics_use.loc[idx, 'forecast_cumulative_procurement_cost'] = last_forecasted_cumulative_procurement_cost + (prev_avg_inventory - current_forecast_COGS - current_forecast_avg_inventory)*-1
                last_forecasted_cumulative_procurement_cost = last_forecasted_cumulative_procurement_cost + (prev_avg_inventory - current_forecast_COGS - current_forecast_avg_inventory)*-1
            else:
                forecast_metrics_use.loc[idx, 'forecast_cumulative_procurement_cost'] = last_forecasted_cumulative_procurement_cost
        else:
            prev_avg_inventory = latest_actual_avg_inventory
            current_forecast_COGS = forecast_metrics_use.loc[idx, 'forecast_COGS']
            current_forecast_avg_inventory = forecast_metrics_use.loc[idx, 'forecast_avg_inventory']
            if prev_avg_inventory - current_forecast_COGS - current_forecast_avg_inventory < 0:
                forecast_metrics_use.loc[idx, 'forecast_cumulative_procurement_cost'] = latest_actual_cumulative_procurement_cost + (prev_avg_inventory - current_forecast_COGS - current_forecast_avg_inventory)*-1
                last_forecasted_cumulative_procurement_cost = latest_actual_cumulative_procurement_cost + (prev_avg_inventory - current_forecast_COGS - current_forecast_avg_inventory)*-1
            else:
                forecast_metrics_use.loc[idx, 'forecast_cumulative_procurement_cost'] = latest_actual_cumulative_procurement_cost
                last_forecasted_cumulative_procurement_cost = latest_actual_cumulative_procurement_cost

        if last_forecasted_cumulative_net_profit is not None:
            forecast_metrics_use.loc[idx, 'forecast_cumulative_net_profit'] = last_forecasted_cumulative_net_profit + forecast_metrics_use.loc[idx, 'forecast_net_profit']
            last_forecasted_cumulative_net_profit = last_forecasted_cumulative_net_profit + forecast_metrics_use.loc[idx, 'forecast_net_profit']
        else:
            forecast_metrics_use.loc[idx, 'forecast_cumulative_net_profit'] = latest_actual_cumulative_net_profit + forecast_metrics_use.loc[idx, 'forecast_net_profit']
            last_forecasted_cumulative_net_profit = latest_actual_cumulative_net_profit+ forecast_metrics_use.loc[idx, 'forecast_net_profit']

    forecast_metrics_use['forecast_cumulative_procurement_cost_with_payment'] = forecast_metrics_use['forecast_cumulative_procurement_cost'] - 0.8 * forecast_metrics_use['forecast_cumulative_net_profit']
    forecast_metrics_use['forecast_AP_to_inventory_ratio'] = forecast_metrics_use['forecast_cumulative_procurement_cost_with_payment'] / forecast_metrics_use['forecast_avg_inventory']


    rename_dict = {
        'Indicator': 'Indicator',
        'data_month_last_day': 'data_month_last_day',

        'total_revenue': 'actual_revenue',
        'COGS': 'actual_COGS',
        'total_operating_expenses': 'actual_operating_expenses',
        'net_profit': 'actual_net_profit',
        'cumulative_net_profit': 'actual_cumulative_net_profit',
        'avg_inventory': 'actual_avg_inventory',
        'DSI': 'actual_DSI',
        'cumulative_procurement_cost': 'actual_cumulative_procurement_AP',
        'cumulative_procurement_cost_with_payment': 'actual_cumulative_procurement_AP_with_payment',
        'AP_to_inventory_ratio': 'actual_AP_to_inventory_ratio',
        
        'forecast_total_revenue': 'forecast_revenue',
        'forecast_COGS': 'forecast_COGS',
        'forecast_operating_expenses': 'forecast_operating_expenses',
        'forecast_net_profit': 'forecast_net_profit',
        'forecast_cumulative_net_profit': 'forecast_cumulative_net_profit',
        'forecast_avg_inventory': 'forecast_avg_inventory',
        'forecast_DSI': 'forecast_DSI',
        'forecast_cumulative_procurement_cost': 'forecast_cumulative_procurement_AP',
        'forecast_cumulative_procurement_cost_with_payment': 'forecast_cumulative_procurement_AP_with_payment',
        'forecast_AP_to_inventory_ratio': 'forecast_AP_to_inventory_ratio'
    }

    forecast_metrics_use.rename(columns=rename_dict, inplace=True)
    desired_order = list(rename_dict.values())
    other_cols = [col for col in forecast_metrics_use.columns if col not in desired_order]
    forecast_metrics_use = forecast_metrics_use[desired_order + other_cols]

    ##############################################################################################################
    # Finalizing output format to be sent to frontend
    ##############################################################################################################
    # Step 1: Extract year and month for use in grouping and x-axis
    forecast_metrics_use['year'] = forecast_metrics_use['data_month_last_day'].dt.year
    forecast_metrics_use['month'] = forecast_metrics_use['data_month_last_day'].dt.strftime('%b')  # e.g., 'Jan'

    # -------------------------------
    # Step 2: Line Chart Data (Nivo)
    # -------------------------------
    def build_nivo_lines(df, metric_base):
        lines = []

        actual_col = f'actual_{metric_base}'
        forecast_col = f'forecast_{metric_base}'

        calendar_months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

        # Step 1: Get latest actuals by year
        latest_actuals_by_year = (
            df[df['Indicator'] == 'Actuals']
            .sort_values(['year', 'data_month_last_day'])
            .groupby('year')
            .last()
        )

        for (year, indicator), group in df.groupby(['year', 'Indicator']):
            group = group.set_index('month')  # use 'Jan', 'Feb', etc. as index
            series = []

            for m in calendar_months:
                if indicator == 'Actuals' and actual_col in group.columns and m in group.index:
                    val = group.at[m, actual_col]
                    if pd.notna(val):
                        series.append({"x": m, "y": float(val)})

                elif indicator == 'Forecast' and forecast_col in group.columns and m in group.index:
                    val = group.at[m, forecast_col]
                    if pd.notna(val):
                        series.append({"x": m, "y": float(val)})

            # Step 2: For forecast, prepend the last actual month (if exists for that year)
            if indicator == 'Forecast' and year in latest_actuals_by_year.index:
                last_actual_month = latest_actuals_by_year.loc[year, 'month']
                last_actual_value = latest_actuals_by_year.loc[year, actual_col]
                if pd.notna(last_actual_value):
                    series = [{"x": last_actual_month, "y": float(last_actual_value)}] + series

            lines.append({
                "id": f"{year} {indicator}",
                "data": series,
                "indicator": indicator,
                "year": int(year)
            })

        return lines

    line_chart_data = {
        "revenue": build_nivo_lines(forecast_metrics_use, 'revenue')
    }

    # -------------------------------
    # Step 3: Table Data (merged format)
    # -------------------------------
    # Define all table-relevant fields
    table_metrics = {
        "revenue": ("actual_revenue", "forecast_revenue"),
        "COGS": ("actual_COGS", "forecast_COGS"),
        "operating_expenses": ("actual_operating_expenses", "forecast_operating_expenses"),
        "net_profit": ("actual_net_profit", "forecast_net_profit"),
        "cumulative_net_profit": ("actual_cumulative_net_profit", "forecast_cumulative_net_profit"),
        "avg_inventory": ("actual_avg_inventory", "forecast_avg_inventory"),
        "DSI": ("actual_DSI", "forecast_DSI"),
        "cumulative_procurement_AP": ("actual_cumulative_procurement_AP", "forecast_cumulative_procurement_AP"),
        "cumulative_procurement_AP_with_payment": ("actual_cumulative_procurement_AP_with_payment", "forecast_cumulative_procurement_AP_with_payment"),
        "AP_to_inventory_ratio": ("actual_AP_to_inventory_ratio", "forecast_AP_to_inventory_ratio"),
        "applied_growth_rate_revenue": ("applied_growth_rate_revenue", "applied_growth_rate_revenue"),
        "applied_growth_rate_DSI": ("applied_growth_rate_DSI", "applied_growth_rate_DSI"),
    }

    table_output = {}

    for year, group in forecast_metrics_use.groupby('year'):
        year_data = {}

        for metric, (actual_col, forecast_col) in table_metrics.items():
            month_dict = {}

            for _, row in group.iterrows():
                month = row['month']

                # Special case: metrics with no actual/forecast split (e.g., growth rates)
                if actual_col == forecast_col and pd.notna(row[actual_col]):
                    month_dict[month] = {"type": "forecast", "value": float(row[actual_col])}
                elif pd.notna(row.get(actual_col)):
                    month_dict[month] = {"type": "actual", "value": float(row[actual_col])}
                elif pd.notna(row.get(forecast_col)):
                    month_dict[month] = {"type": "forecast", "value": float(row[forecast_col])}

            year_data[metric] = month_dict

        table_output[str(year)] = year_data

    # -------------------------------
    # Step 4: Final return
    # -------------------------------
    return jsonify({
        "line_chart_data": line_chart_data,
        "table_data": table_output
    })

@app.route('/evaluate_strategy/AR_AP_and_statements_closing_with_forecast_chart_data', methods=['GET'])
def get_evaluate_strategy_AR_AP_and_statements_closing_with_forecast_chart_data():

   # Get parameters from the request
    brand = request.args.get('brand')
    ir = request.args.get('ir')

    # Get forecast parameters
    forecast_revenue_method = request.args.get('forecast_revenue_method')
    year_end_total_revenue_target = None
    input_growth_rate = None
    FBMshipping_cost_to_revenue_ratio = None
    if forecast_revenue_method == 'target_revenue':
        year_end_total_revenue_target = request.args.get('year_end_total_revenue_target')
        if year_end_total_revenue_target == '':
            return jsonify({'error': 'Year end total revenue target is required'}), 400
        else:
            year_end_total_revenue_target = float(year_end_total_revenue_target)
    elif forecast_revenue_method == 'flat_growth':
        input_growth_rate = request.args.get('input_growth_rate')
        if input_growth_rate == '':
            input_growth_rate = 0
        else:
            input_growth_rate = float(input_growth_rate) / 100
    FBMshipping_cost_to_revenue_ratio = request.args.get('FBMshipping_cost_to_revenue_ratio')
    if FBMshipping_cost_to_revenue_ratio is None or FBMshipping_cost_to_revenue_ratio == '':
        FBMshipping_cost_to_revenue_ratio = 0.025
    else:
        FBMshipping_cost_to_revenue_ratio = float(FBMshipping_cost_to_revenue_ratio) / 100
    
    # If brand, ir, or sku are empty strings, set them to None
    if brand == '':
        brand = None
    if ir == '':
        ir = None
    
    df, max_actual_date_add_1day = get_AR_AP_by_date_with_statement_shipping_closing_forecast(
        brand, ir, forecast_revenue_method, year_end_total_revenue_target, input_growth_rate, FBMshipping_cost_to_revenue_ratio)
    
    df = df.tail(240)
    
    # Create an entry for each date
    result_data = []
    for _, row in df.iterrows():
        result_data.append({
            'date': row['date'].isoformat(),  # e.g., "2024-01-01"
            'AR_cumulative': round(row['AR_cumulative'], 2),
            'AP_cumulative': round(row['AP_cumulative'], 2),
            'AR_closing': round(row['AR_closing'], 2),
            'AP_closing': round(row['AP_closing'], 2)
        })
    
    # Format the forecast start date for the response
    forecast_start_date = max_actual_date_add_1day.isoformat() if max_actual_date_add_1day else None
    
    return jsonify({
        'chart_data': result_data,
        'forecast_start_date': forecast_start_date
    })

@app.route('/evaluate_strategy/cashflow_AR_AP_net_add_vendor_payment_actuals_and_forecast_chart_data', methods=['GET'])
def get_cashflow_AR_AP_net_add_vendor_payment_actuals_and_forecast_chart_data():
    # Get parameters from the request
    brand = request.args.get('brand')
    ir = request.args.get('ir')

    # Get forecast parameters
    forecast_revenue_method = request.args.get('forecast_revenue_method')
    year_end_total_revenue_target = None
    input_growth_rate = None
    FBMshipping_cost_to_revenue_ratio = None
    if forecast_revenue_method == 'target_revenue':
        year_end_total_revenue_target = request.args.get('year_end_total_revenue_target')
        if year_end_total_revenue_target == '':
            return jsonify({'error': 'Year end total revenue target is required'}), 400
        else:
            year_end_total_revenue_target = float(year_end_total_revenue_target)
    elif forecast_revenue_method == 'flat_growth':
        input_growth_rate = request.args.get('input_growth_rate')
        if input_growth_rate == '':
            input_growth_rate = 0
        else:
            input_growth_rate = float(input_growth_rate) / 100
    FBMshipping_cost_to_revenue_ratio = request.args.get('FBMshipping_cost_to_revenue_ratio')
    if FBMshipping_cost_to_revenue_ratio is None or FBMshipping_cost_to_revenue_ratio == '':
        FBMshipping_cost_to_revenue_ratio = 0.025
    else:
        FBMshipping_cost_to_revenue_ratio = float(FBMshipping_cost_to_revenue_ratio) / 100
    
    # If brand, ir, or sku are empty strings, set them to None
    if brand == '':
        brand = None
    if ir == '':
        ir = None
    
    AR_AP_df, max_actual_date_add_1day = get_AR_AP_by_date_with_statement_shipping_closing_forecast(
        brand, ir, forecast_revenue_method, year_end_total_revenue_target, input_growth_rate, FBMshipping_cost_to_revenue_ratio)
    
    vendor_payment_paid_and_AP_df = get_vendor_payment_paid_and_AP()
    
    exceptions = ['ALEG', 'V3520']
    def custom_ir_extraction(product):
        if isinstance(product, str) and any(product.startswith(prefix) for prefix in exceptions):
            return product  # keep original
        else:
            return product.rsplit('-', 1)[0] if isinstance(product, str) and '-' in product else product
    vendor_payment_paid_and_AP_df['ir'] = vendor_payment_paid_and_AP_df['product'].apply(custom_ir_extraction)
    query = """
    select
        distinct SKU as SKU
        from allorderspnl
    """
    unique_sku_result = pd.DataFrame(db.session.execute(text(query)).mappings().all())
    def first_matched_SKU(ir):
        matched = unique_sku_result[unique_sku_result['SKU'].str.contains(f"{ir}", case=False, na=False)]
        return matched['SKU'].iloc[0] if not matched.empty else None
    vendor_payment_paid_and_AP_df['sku_one_example'] = vendor_payment_paid_and_AP_df['ir'].apply(first_matched_SKU)
    vendor_payment_paid_and_AP_df = vendor_payment_paid_and_AP_df.drop(columns=['ir'])
    vendor_payment_paid_and_AP_df['brand'] = vendor_payment_paid_and_AP_df['sku_one_example'].apply(lambda s: s.split('_', 1)[0] if isinstance(s, str) else None)
    vendor_payment_paid_and_AP_df['main_component'] = vendor_payment_paid_and_AP_df['sku_one_example'].apply(
        lambda s: s.split('_', 1)[-1].split('_', 1)[0] if isinstance(s, str) and '_' in s else None
    )
    vendor_payment_paid_and_AP_df = vendor_payment_paid_and_AP_df.drop(columns=['sku_one_example'])

    # clean data for dates to date, then aggregate
    vendor_payment_paid_and_AP_df['order_date'] = pd.to_datetime(vendor_payment_paid_and_AP_df['order_date']).dt.date
    vendor_payment_paid_and_AP_df['payment_date'] = pd.to_datetime(vendor_payment_paid_and_AP_df['payment_date']).dt.date
    vendor_payment_paid_and_AP_df['vendor_AP_due_date'] = pd.to_datetime(vendor_payment_paid_and_AP_df['vendor_AP_due_date']).dt.date

    vendor_payment_paid_and_AP_df['payment_date'] = np.where(
        vendor_payment_paid_and_AP_df['vendor_AP_due_date'].notna(),
        vendor_payment_paid_and_AP_df['vendor_AP_due_date'],
        vendor_payment_paid_and_AP_df['payment_date']
    )
    vendor_payment_paid_and_AP_df['payment_amount'] = pd.to_numeric(vendor_payment_paid_and_AP_df['payment_amount'], errors='coerce')
    vendor_payment_paid_and_AP_df['vendor_AP'] = pd.to_numeric(vendor_payment_paid_and_AP_df['vendor_AP'], errors='coerce')
    vendor_payment_paid_and_AP_df['vendor_AP'] = np.where(
        vendor_payment_paid_and_AP_df['payment_amount'].notna(),
        vendor_payment_paid_and_AP_df['payment_amount'],
        vendor_payment_paid_and_AP_df['vendor_AP']
    )
    vendor_payment_paid_and_AP_df['vendor_AP'] = vendor_payment_paid_and_AP_df['vendor_AP'].fillna(0)

    # Get Equity Cash
    # parameters for initial equity to be added as cash
    cutoff_date = datetime(2024, 7, 31).date()
    equity_deduction = 809998.6

    # deduct initial equity purchased inventory
    procurement_cost_sum_til_Jul24 = vendor_payment_paid_and_AP_df[
        vendor_payment_paid_and_AP_df['order_date'] <= cutoff_date
    ]['total_cost'].sum()
    vendor_payment_paid_and_AP_df['procurement_cost_sum_til_Jul24'] = np.nan
    vendor_payment_paid_and_AP_df.loc[
        vendor_payment_paid_and_AP_df['order_date'] <= cutoff_date,
        'procurement_cost_sum_til_Jul24'
    ] = procurement_cost_sum_til_Jul24
    vendor_payment_paid_and_AP_df['percent_of_procurement_cost_sum_til_Jul24'] = 0
    vendor_payment_paid_and_AP_df.loc[
        vendor_payment_paid_and_AP_df['order_date'] <= cutoff_date,
        'percent_of_procurement_cost_sum_til_Jul24'
    ] = vendor_payment_paid_and_AP_df['total_cost'] / procurement_cost_sum_til_Jul24
    vendor_payment_paid_and_AP_df['cash_to_add_from_equity'] = 0
    vendor_payment_paid_and_AP_df.loc[
        vendor_payment_paid_and_AP_df['order_date'] <= cutoff_date,
        'cash_to_add_from_equity'
    ] = vendor_payment_paid_and_AP_df['percent_of_procurement_cost_sum_til_Jul24'] * equity_deduction
    vendor_payment_paid_and_AP_df.drop(columns=['procurement_cost_sum_til_Jul24', 'percent_of_procurement_cost_sum_til_Jul24'], inplace=True)

    # Apply filters if provided
    if brand is not None:
        vendor_payment_paid_and_AP_df = vendor_payment_paid_and_AP_df[vendor_payment_paid_and_AP_df['brand'] == brand]
    if ir is not None:
        vendor_payment_paid_and_AP_df = vendor_payment_paid_and_AP_df[vendor_payment_paid_and_AP_df['main_component'] == ir]
    
    # add vendor_AP_cumulative
    vendor_payment_paid_and_AP_df_no_equity = vendor_payment_paid_and_AP_df.groupby('payment_date')[['vendor_AP']].sum().reset_index()  
    AR_AP_df = pd.merge(
        AR_AP_df, 
        vendor_payment_paid_and_AP_df_no_equity, 
        left_on='date', 
        right_on='payment_date', 
        how='outer'
    )
    AR_AP_df['vendor_AP'] = AR_AP_df['vendor_AP'].fillna(0)
    AR_AP_df = AR_AP_df.sort_values(by='date')
    AR_AP_df['vendor_AP_cumulative'] = AR_AP_df['vendor_AP'].cumsum()

    # add equity cash
    vendor_payment_paid_and_AP_df_equity = vendor_payment_paid_and_AP_df[vendor_payment_paid_and_AP_df['cash_to_add_from_equity'] != 0]
    vendor_payment_paid_and_AP_df_equity = vendor_payment_paid_and_AP_df_equity.groupby('order_date')[['cash_to_add_from_equity']].sum().reset_index()
    AR_AP_df = pd.merge(
        AR_AP_df, 
        vendor_payment_paid_and_AP_df_equity, 
        left_on='date', 
        right_on='order_date', 
        how='outer'
    )
    AR_AP_df['cash_to_add_from_equity'] = AR_AP_df['cash_to_add_from_equity'].fillna(0)
    AR_AP_df['order_date'] = pd.to_datetime(AR_AP_df['order_date']).dt.date
    AR_AP_df['date'] = pd.to_datetime(AR_AP_df['date']).dt.date
    AR_AP_df['date'] = AR_AP_df['date'].fillna(AR_AP_df['order_date'])
    AR_AP_df = AR_AP_df.sort_values(by='date')
    AR_AP_df['cash_to_add_from_equity_cumulative'] = AR_AP_df['cash_to_add_from_equity'].cumsum()

    AR_AP_df['AR_closing'] = AR_AP_df['AR_closing'].fillna(0)
    AR_AP_df['AP_closing'] = AR_AP_df['AP_closing'].fillna(0)
    AR_AP_df['vendor_AP'] = AR_AP_df['vendor_AP'].fillna(0)
    AR_AP_df['vendor_AP_cumulative'] = AR_AP_df['vendor_AP_cumulative'].fillna(0)
    AR_AP_df['AR_closing_cumulative'] = AR_AP_df['AR_closing'].cumsum()
    AR_AP_df['AP_closing_cumulative'] = AR_AP_df['AP_closing'].cumsum()
    AR_AP_df['cash_cumulative'] = AR_AP_df['AR_closing_cumulative'] + AR_AP_df['AP_closing_cumulative'] + AR_AP_df['vendor_AP_cumulative'] + AR_AP_df['cash_to_add_from_equity_cumulative']

    ###### get forecast procurement due date ######
    forecast_DSI_method = request.args.get('forecast_dsi_method')
    if forecast_DSI_method == 'target_DSI':
        year_end_DSI_target = request.args.get('target_dsi')
        if year_end_DSI_target == '':
            return jsonify({'error': 'Year end total DSI target is required'}), 400
        else:
            year_end_DSI_target = float(year_end_DSI_target) # Convert to float for calculations
    elif forecast_DSI_method == 'flat_change':
        input_DSI_change_rate = request.args.get('dsi_change_rate')
        if input_DSI_change_rate == '':
            input_DSI_change_rate = 0
        else:
            input_DSI_change_rate = float(input_DSI_change_rate) / 100  # Convert to float before dividing

    DSI_period_in_days = request.args.get('dsi_period')
    if DSI_period_in_days:
        DSI_period_in_days = int(DSI_period_in_days)
    else:
        DSI_period_in_days = 30
    
    query_get_latest_date = """
    select max(purchase_date_pst_pdt)
    from allorderspnl
    """
    latest_date_result = db.session.execute(text(query_get_latest_date)).fetchone()
    if not latest_date_result or latest_date_result[0] is None:
        return jsonify({'error': 'No Orders data found'}), 404
    else:
        as_of_date = latest_date_result[0]
        as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d %H:%M:%S.%f')
    
    # get revenue, cogs, operating expenses
    forecast_metrics = get_revenue_cogs_operating_expenses_by_period_since_beginning(as_of_date, 'month')
    forecast_metrics['data_month_last_day'] =pd.to_datetime(forecast_metrics['data_month_last_day'])

    # get DSI
    unique_months = forecast_metrics['data_month_last_day'].unique()
    dsi_result_df = []
    for month in unique_months:
        dsi = get_DSI(month, DSI_period_in_days)
        dsi['avg_inventory'] = dsi['DSI'] / DSI_period_in_days * dsi['COGS']
        dsi['data_month_last_day'] = month
        dsi_result_df.append(dsi)
    dsi_result_df = pd.concat(dsi_result_df)
    dsi_result_df.drop(columns=['DSI','inventory_start_value','inventory_end_value'], inplace=True)
    dsi_result_df.rename(columns={'COGS':'DSI_COGS'}, inplace=True)
    forecast_metrics = pd.merge(
        forecast_metrics, 
        dsi_result_df, 
        left_on=['data_month_last_day', 'sku'], 
        right_on=['data_month_last_day', 'SKU'], 
        how='left'
    )
    forecast_metrics.drop(columns=['SKU'], inplace=True)

    # get procurement AP (first generate full SKU list for all months, then join with cumulative procurement cost)
    forecast_metrics['sku'] = forecast_metrics['sku'].fillna('NonSKU_NonSKU_NonSKU')
    min_month = forecast_metrics['data_month_last_day'].min()
    max_month = as_of_date + pd.offsets.MonthEnd(0)
    all_months = pd.date_range(
        start=min_month,
        end=max_month,
        freq='ME'
    )
    all_skus = forecast_metrics['sku'].unique()
    full_index = pd.MultiIndex.from_product(
        [all_months, all_skus],
        names=['data_month_last_day', 'sku']
    )
    full_grid = pd.DataFrame(index=full_index).reset_index()
    forecast_metrics = pd.merge(
        full_grid,
        forecast_metrics,
        on=['data_month_last_day', 'sku'],
        how='left'
    )
    forecast_metrics['sku'] = forecast_metrics['sku'].replace('NonSKU_NonSKU_NonSKU', np.nan)
    forecast_metrics['brand'] = forecast_metrics['sku'].apply(lambda s: s.split('_', 1)[0] if isinstance(s, str) else None)
    forecast_metrics['main_component'] = forecast_metrics['sku'].apply(
        lambda s: s.split('_', 1)[-1].split('_', 1)[0] if isinstance(s, str) and '_' in s else None
    )

    procurement_AP_result = get_procurement_AP(as_of_date)

    forecast_metrics = pd.merge(
        forecast_metrics, 
        procurement_AP_result, 
        left_on=['data_month_last_day', 'main_component'], 
        right_on=['data_month_last_day', 'main_component'], 
        how='left'
    )
    forecast_metrics.drop(columns=['procurement_cost'], inplace=True)
    forecast_metrics['Indicator'] = 'Actuals'

    # Apply filters if provided
    if brand is not None:
        forecast_metrics = forecast_metrics[forecast_metrics['brand'] == brand]
    if ir is not None:
        forecast_metrics = forecast_metrics[forecast_metrics['main_component'] == ir]
    
    ###################
    ###   actuals   ###
    ###################
    # revenue, cogs, operating expenses
    forecast_metrics_use = forecast_metrics.groupby(['Indicator','data_month_last_day'])[[
        'total_revenue',
        'COGS',
        'total_operating_expenses',
        'avg_inventory',
        'DSI_COGS'
    ]].sum()

    # DSI   
    forecast_metrics_use['DSI'] = forecast_metrics_use['avg_inventory'] / forecast_metrics_use['DSI_COGS'] * DSI_period_in_days
    forecast_metrics_use.drop(columns=['DSI_COGS'], inplace=True)
    # cumulative procurement cost - need to remove duplicate cumulative procurement cost for the same main_component (repeated due to left join with SKU)
    forecast_metrics['main_component_repeat_times_helper'] = forecast_metrics['data_month_last_day'].dt.strftime("%b'%y") + forecast_metrics['main_component'].fillna('missing')
    forecast_metrics['main_component_repeat_times']=forecast_metrics.groupby(['main_component_repeat_times_helper']).cumcount() + 1
    mask = (forecast_metrics['main_component_repeat_times'] == 1) | (forecast_metrics['main_component_repeat_times'].isna())
    forecast_metrics.loc[~mask, 'cumulative_procurement_cost'] = 0
    cumulative_procurement_cost_result = forecast_metrics.groupby(['Indicator','data_month_last_day'])['cumulative_procurement_cost'].sum()
    forecast_metrics_use = pd.merge(
        forecast_metrics_use, 
        cumulative_procurement_cost_result, 
        left_on=['Indicator','data_month_last_day'], 
        right_on=['Indicator','data_month_last_day'], 
        how='left')
    # cumulative procurement with payment (80% of monthly net profit)
    forecast_metrics_use['net_profit'] = forecast_metrics_use['total_revenue'] - forecast_metrics_use['COGS'] + forecast_metrics_use['total_operating_expenses']
    forecast_metrics_use['cumulative_net_profit'] = forecast_metrics_use['net_profit'].cumsum()
    forecast_metrics_use['cumulative_procurement_cost_with_payment'] = forecast_metrics_use['cumulative_procurement_cost'] - 0.8 * forecast_metrics_use['cumulative_net_profit']
    # AP (cumulative procurement with payment) to inventory ratio
    forecast_metrics_use['AP_to_inventory_ratio'] = forecast_metrics_use['cumulative_procurement_cost_with_payment'] / forecast_metrics_use['avg_inventory']
    # average COGS and Expense % to revenue for forecast
    average_cogs_to_revenue = forecast_metrics_use['COGS'].sum() / forecast_metrics_use['total_revenue'].sum()
    average_expense_to_revenue = forecast_metrics_use['total_operating_expenses'].sum() / forecast_metrics_use['total_revenue'].sum()
    forecast_metrics_use = forecast_metrics_use.reset_index()

    ###################
    ###   forecast  ###
    ###################
    # initialize forecast dataframe with month-end dates from next month to December same year
    max_month = forecast_metrics_use['data_month_last_day'].max()
    next_month_start = (max_month + pd.offsets.MonthBegin(1))
    month_ends = pd.date_range(
        start=next_month_start,
        end=pd.Timestamp(year=as_of_date.year, month=12, day=31),
        freq='M'  # month-end
    )
    forecast = pd.DataFrame({
        'Indicator': ['Forecast'] * len(month_ends),
        'data_month_last_day': month_ends
    })
    for col in forecast_metrics_use.columns:
        if col not in forecast.columns:
            forecast[col] = np.nan
    forecast_metrics_use = pd.concat(
        [forecast_metrics_use, forecast],
        axis=0,
        ignore_index=True  
    )
    forecast_metrics_use = forecast_metrics_use.sort_values(by=['Indicator','data_month_last_day'])
    forecast_metrics_use.reset_index()

    #--------------------------------
    # forecast revenue  & DSI        |
    #--------------------------------
    forecast_metrics_use['forecast_total_revenue'] = np.nan
    forecast_metrics_use['applied_growth_rate_revenue'] = np.nan

    forecast_metrics_use['forecast_DSI'] = np.nan
    forecast_metrics_use['applied_growth_rate_DSI'] = np.nan

    # Build reference data
    actuals_df = forecast_metrics_use[forecast_metrics_use['Indicator'] == 'Actuals']
    actual_revenue_by_month = dict(zip(actuals_df['data_month_last_day'], actuals_df['total_revenue']))
    actual_DSI_by_month = dict(zip(actuals_df['data_month_last_day'], actuals_df['DSI']))

    # Grab current year's revenue for forecast_revenue_method == 'target_revenue' scenario, calculat remaining revenue and months that need to solve for realize target
    current_year = as_of_date.year
    actuals_this_year = actuals_df[actuals_df['data_month_last_day'].dt.year == current_year]
    actual_months = len(actuals_this_year)
    actual_revenue_sum = actuals_this_year['total_revenue'].sum()
    latest_actual_revenue = actuals_df.sort_values('data_month_last_day')['total_revenue'].iloc[-1]
    if forecast_revenue_method == 'target_revenue':
        target_remaining = year_end_total_revenue_target - actual_revenue_sum
        months_remaining = 12 - actual_months
        def revenue_sum_equation(growth):
            return sum([latest_actual_revenue * (1 + growth)**i for i in range(1, months_remaining + 1)]) - target_remaining - 0.1
        try:
            result = root_scalar(revenue_sum_equation, method='brentq', bracket=[-1, 3.0])
            solved_growth = result.root
        except ValueError:
            solved_growth = 0

    # Grab latest DSI for forecast_DSI_method == 'target' scenario, calculat growth rate to achieve target
    latest_DSI_row = actuals_df[actuals_df['DSI'].notna()].sort_values('data_month_last_day').iloc[-1]
    latest_actual_DSI = latest_DSI_row['DSI']
    latest_DSI_month = latest_DSI_row['data_month_last_day']
    if forecast_DSI_method == 'target_DSI':
        months_remaining_to_year_end = 12 - latest_DSI_month.month
        solved_growth_DSI = (year_end_DSI_target / latest_actual_DSI) ** (1 / months_remaining_to_year_end) - 1

    # Loop over forecast rows
    last_forecasted_revenue = None # Track last revenue (first from actuals, then from forecast)
    last_forecasted_DSI = None # Track last DSI (first from actuals, then from forecast)
    for idx, row in forecast_metrics_use[forecast_metrics_use['Indicator'] == 'Forecast'].iterrows():
        curr_month = row['data_month_last_day']
        last_year = curr_month.year - 1

        this_month_last_year = curr_month.replace(year=last_year)
        prev_month_last_year = this_month_last_year - pd.offsets.MonthEnd(1)

        rev_this = actual_revenue_by_month.get(this_month_last_year)
        rev_prev = actual_revenue_by_month.get(prev_month_last_year)

        DSI_this = actual_DSI_by_month.get(this_month_last_year)
        DSI_prev = actual_DSI_by_month.get(prev_month_last_year)

        # Determine the base revenue (first from actuals, then from forecast)
        if last_forecasted_revenue is not None:
            base_revenue = last_forecasted_revenue
        else:
            base_revenue = latest_actual_revenue

        if last_forecasted_DSI is not None:
            base_DSI = last_forecasted_DSI
        else:
            base_DSI = latest_actual_DSI

        if forecast_revenue_method == 'benchmark':
            if rev_this is not None and rev_prev is not None and rev_this > 0 and rev_prev > 0:
                mom_growth = (rev_this - rev_prev) / rev_prev
            else:
                mom_growth = 0
        elif forecast_revenue_method == 'target_revenue':
            mom_growth = solved_growth
        elif forecast_revenue_method == 'flat_growth':
            mom_growth = input_growth_rate

        if forecast_DSI_method == 'benchmark':
            if DSI_this is not None and DSI_prev is not None and DSI_this > 0 and DSI_prev > 0:
                mom_DSI_growth = (DSI_this - DSI_prev) / DSI_prev
            else:
                mom_DSI_growth = 0
        elif forecast_DSI_method == 'target_DSI':
            mom_DSI_growth = solved_growth_DSI
        elif forecast_DSI_method == 'flat_change':
            mom_DSI_growth = input_DSI_change_rate

        # Calculate forecasted revenue
        if base_revenue is not None:
            forecast_value = base_revenue * (1 + mom_growth) if mom_growth is not None else base_revenue
            last_forecasted_revenue = forecast_value

            forecast_metrics_use.at[idx, 'forecast_total_revenue'] = forecast_value
            forecast_metrics_use.at[idx, 'applied_growth_rate_revenue'] = mom_growth
        
        if base_DSI is not None:
            forecast_value = base_DSI * (1 + mom_DSI_growth) if mom_DSI_growth is not None else base_DSI
            last_forecasted_DSI = forecast_value

            forecast_metrics_use.at[idx, 'forecast_DSI'] = forecast_value
            forecast_metrics_use.at[idx, 'applied_growth_rate_DSI'] = mom_DSI_growth

    #---------------------------------------------------------------------------------------------------------------------------------------------
    # forecast COGS, operating expenses, net profit, avg inventory, cumulative procurement cost, cumulative net profit, AP to inventory ratio     |
    #---------------------------------------------------------------------------------------------------------------------------------------------
    
    forecast_metrics_use['forecast_COGS'] = forecast_metrics_use['forecast_total_revenue'] * average_cogs_to_revenue
    forecast_metrics_use['forecast_operating_expenses'] = forecast_metrics_use['forecast_total_revenue'] * average_expense_to_revenue
    forecast_metrics_use['forecast_net_profit'] = forecast_metrics_use['forecast_total_revenue'] - forecast_metrics_use['forecast_COGS'] + forecast_metrics_use['forecast_operating_expenses']

    forecast_metrics_use['forecast_avg_inventory'] = forecast_metrics_use['forecast_DSI'] / DSI_period_in_days * forecast_metrics_use['forecast_COGS']

    latest_actual_cumulative_procurement_cost = actuals_df.sort_values('data_month_last_day')['cumulative_procurement_cost'].iloc[-1]
    latest_actual_avg_inventory = actuals_df.sort_values('data_month_last_day')['avg_inventory'].iloc[-1]
    last_forecasted_cumulative_procurement_cost = None
    forecast_metrics_use['forecast_cumulative_procurement_cost'] = np.nan

    latest_actual_cumulative_net_profit = actuals_df.sort_values('data_month_last_day')['cumulative_net_profit'].iloc[-1]
    last_forecasted_cumulative_net_profit = None
    forecast_metrics_use['forecast_cumulative_net_profit'] = np.nan

    for idx, row in forecast_metrics_use[forecast_metrics_use['Indicator'] == 'Forecast'].iterrows():
        if last_forecasted_cumulative_procurement_cost is not None:
            prev_avg_inventory = forecast_metrics_use.loc[idx - 1, 'forecast_avg_inventory']
            current_forecast_COGS = forecast_metrics_use.loc[idx, 'forecast_COGS']
            current_forecast_avg_inventory = forecast_metrics_use.loc[idx, 'forecast_avg_inventory']
            if prev_avg_inventory - current_forecast_COGS - current_forecast_avg_inventory < 0:
                forecast_metrics_use.loc[idx, 'forecast_cumulative_procurement_cost'] = last_forecasted_cumulative_procurement_cost + (prev_avg_inventory - current_forecast_COGS - current_forecast_avg_inventory)*-1
                last_forecasted_cumulative_procurement_cost = last_forecasted_cumulative_procurement_cost + (prev_avg_inventory - current_forecast_COGS - current_forecast_avg_inventory)*-1
            else:
                forecast_metrics_use.loc[idx, 'forecast_cumulative_procurement_cost'] = last_forecasted_cumulative_procurement_cost
        else:
            prev_avg_inventory = latest_actual_avg_inventory
            current_forecast_COGS = forecast_metrics_use.loc[idx, 'forecast_COGS']
            current_forecast_avg_inventory = forecast_metrics_use.loc[idx, 'forecast_avg_inventory']
            if prev_avg_inventory - current_forecast_COGS - current_forecast_avg_inventory < 0:
                forecast_metrics_use.loc[idx, 'forecast_cumulative_procurement_cost'] = latest_actual_cumulative_procurement_cost + (prev_avg_inventory - current_forecast_COGS - current_forecast_avg_inventory)*-1
                last_forecasted_cumulative_procurement_cost = latest_actual_cumulative_procurement_cost + (prev_avg_inventory - current_forecast_COGS - current_forecast_avg_inventory)*-1
            else:
                forecast_metrics_use.loc[idx, 'forecast_cumulative_procurement_cost'] = latest_actual_cumulative_procurement_cost
                last_forecasted_cumulative_procurement_cost = latest_actual_cumulative_procurement_cost

        if last_forecasted_cumulative_net_profit is not None:
            forecast_metrics_use.loc[idx, 'forecast_cumulative_net_profit'] = last_forecasted_cumulative_net_profit + forecast_metrics_use.loc[idx, 'forecast_net_profit']
            last_forecasted_cumulative_net_profit = last_forecasted_cumulative_net_profit + forecast_metrics_use.loc[idx, 'forecast_net_profit']
        else:
            forecast_metrics_use.loc[idx, 'forecast_cumulative_net_profit'] = latest_actual_cumulative_net_profit + forecast_metrics_use.loc[idx, 'forecast_net_profit']
            last_forecasted_cumulative_net_profit = latest_actual_cumulative_net_profit+ forecast_metrics_use.loc[idx, 'forecast_net_profit']
    
    forecast_metrics_use['cumulative_procurement_cost'] = forecast_metrics_use['cumulative_procurement_cost'].fillna(forecast_metrics_use['forecast_cumulative_procurement_cost'])
    forecast_metrics_use = forecast_metrics_use[['Indicator','data_month_last_day','cumulative_procurement_cost']]
    forecast_metrics_use['data_month_last_day'] = pd.to_datetime(forecast_metrics_use['data_month_last_day'])
    forecast_metrics_use = forecast_metrics_use.sort_values(by='data_month_last_day')
    forecast_metrics_use['change_from_prev'] = forecast_metrics_use['cumulative_procurement_cost'].diff()

    forecast_metrics_use = forecast_metrics_use[forecast_metrics_use['Indicator'] == 'Forecast']
    forecast_metrics_use['new_procurement_due_date'] = forecast_metrics_use['data_month_last_day'] + pd.DateOffset(months=3)
    forecast_metrics_use['new_procurement_due_date'] = pd.to_datetime(forecast_metrics_use['new_procurement_due_date']).dt.date
    forecast_metrics_use = forecast_metrics_use[['new_procurement_due_date','change_from_prev']]
    forecast_metrics_use['change_from_prev'] = forecast_metrics_use['change_from_prev']*-1
    forecast_metrics_use = forecast_metrics_use.rename(columns={'change_from_prev': 'new_procurement_cost_due_amount'})
    
    # Final AR_AP_df with new_procurement_cost_due_amount
    AR_AP_df = AR_AP_df.tail(240)
    AR_AP_df = pd.merge(
        AR_AP_df, 
        forecast_metrics_use, 
        left_on='date', 
        right_on='new_procurement_due_date',
        how='left'
    )
    AR_AP_df['new_procurement_cost_due_amount'] = AR_AP_df['new_procurement_cost_due_amount'].fillna(0)
    AR_AP_df['cumulative_new_procurement_cost_due_amount'] = AR_AP_df['new_procurement_cost_due_amount'].cumsum()
    AR_AP_df['vendor_AP'] = AR_AP_df['vendor_AP'] + AR_AP_df['new_procurement_cost_due_amount']
    AR_AP_df['cash_cumulative'] = AR_AP_df['cash_cumulative'] + AR_AP_df['cumulative_new_procurement_cost_due_amount']
    
    # Create an entry for each date
    result_data = []
    for _, row in AR_AP_df.iterrows():
        result_data.append({
            'date': row['date'].isoformat(),  # e.g., "2024-01-01"
            'cash_cumulative': round(row['cash_cumulative'], 2),
            'vendor_AP_closing': round(row['vendor_AP'], 2)
        })
    
    # Format the forecast start date for the response
    max_actual_date_add_1day = pd.to_datetime(max_actual_date_add_1day).date()
    forecast_start_date = max_actual_date_add_1day.isoformat() if max_actual_date_add_1day else None
    
    return jsonify({
        'chart_data': result_data,
        'forecast_start_date': forecast_start_date
    })
    
@app.route('/evaluate_strategy/po_gantt_chart', methods=['GET'])
def get_po_gantt_chart():
    start_date = request.args.get('po_start_date')
    end_date = request.args.get('po_end_date')
    if not start_date or not end_date:
        return jsonify({'error': 'Missing required inputs'}), 400
    
    direct_html = request.args.get('direct_html')  # Check if direct HTML content is requested
    print(f"PO Gantt Chart Request - Start: {start_date}, End: {end_date}, Direct HTML: {direct_html}")

    # Handle target DSI parameter - this will override the default consumption period
    target_dsi = request.args.get('target_consumption_dsi')
    default_fully_consumption_period = 60  # Default value
    
    if target_dsi:
        try:
            default_fully_consumption_period = int(target_dsi)
            print(f"Using target DSI: {default_fully_consumption_period}")
        except ValueError:
            print(f"Invalid target DSI value: {target_dsi}, using default: {default_fully_consumption_period}")
            pass  # If conversion fails, use the default value

    brand = request.args.get('brand')
    ir = request.args.get('ir')
    if brand == '':
        brand = None
    if ir == '':
        ir = None
    
    print(f"PO Gantt Chart Filters - Brand: {brand}, IR: {ir}")
    
    try:
        # Parse dates
        try:
            # Ensure start_date and end_date are strings
            if not isinstance(start_date, str) or not isinstance(end_date, str):
                return jsonify({"error": "Date inputs must be strings in 'YYYY-MM-DD' format"}), 400
            
            # Validate format
            if not (len(start_date) == 10 and len(end_date) == 10):
                return jsonify({"error": "Dates must be in 'YYYY-MM-DD' format"}), 400
                
            start_date = datetime.strptime(start_date, '%Y-%m-%d')
            end_date = datetime.strptime(end_date, '%Y-%m-%d')
            
            # Ensure start date is before end date
            if start_date >= end_date:
                return jsonify({"error": "Start date must be before end date"}), 400
                
            print(f"Parsed dates - Start: {start_date}, End: {end_date}")
        except ValueError as e:
            error_msg = f"Invalid date format: {str(e)}"
            print(f"Date parsing error: {error_msg}")
            return jsonify({"error": error_msg}), 400
        
        # Generate chart HTML
        print(f"Generating PO Gantt chart with consumption period: {default_fully_consumption_period}")
        html_content = get_PO_ganntt_chart(
            start_date=start_date,
            end_date=end_date,
            default_fully_consumption_period=default_fully_consumption_period,
            brand=brand,
            ir=ir
        )
        
        print(f"Generated HTML content length: {len(html_content) if html_content else 0}")
        
        # Create response with proper headers
        response = app.response_class(
            response=html_content,
            status=200,
            mimetype='text/html'
        )
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        
        return response
    except Exception as e:
        error_msg = f"Failed to generate PO Gantt chart: {str(e)}"
        print(f"Error generating chart: {error_msg}")
        traceback.print_exc()  # Print the full traceback
        return jsonify({"error": error_msg}), 500


