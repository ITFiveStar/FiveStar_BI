from flask import jsonify, request
from sqlalchemy import and_, or_
from sqlalchemy.exc import IntegrityError
from datetime import datetime
import pandas as pd
from backend import app, db
from backend.models import AmazonAllOrders, SKUEconomics, AmazonStatements, AmazonInboundShipping, FBMShippingCost, AllOrdersPnL, AdsSpendByDay, AdsCreditCardPayment, QBAccountIDMapping
from sqlalchemy import text

# ---------------------------------------------------------------------------------------------------------------
# AmazonAllOrders CRUD Operations                                                                               |
# ---------------------------------------------------------------------------------------------------------------

# Create new Amazon order
@app.route('/amazon/all-orders/create', methods=['POST'])
def create_amazon_order():
    data = request.json
    
    if not data:
        return jsonify({'error': 'No data provided.'}), 400
    
    # Handle purchase_date_utc conversion
    try:
        # Input format example: 2024-04-30T22:51:10+00:00
        purchase_date_utc = pd.to_datetime(data.get('purchase_date_utc'), errors='coerce', utc=True)
        if pd.isna(purchase_date_utc):
            return jsonify({'error': 'Invalid purchase_date_utc format. Expected format: 2024-04-30T22:51:10+00:00'}), 400
        
        # Generate purchase_date_pst_pdt automatically
        purchase_date_pst_pdt = purchase_date_utc.tz_convert('US/Pacific')
    except Exception as e:
        return jsonify({'error': f'Error processing date: {str(e)}'}), 400
    
    # Create a new AmazonAllOrders instance
    try:
        new_order = AmazonAllOrders(
            amazon_order_id=data.get('amazon_order_id'),
            purchase_date_utc=purchase_date_utc.tz_convert('UTC').tz_localize(None).to_pydatetime(),
            purchase_date_pst_pdt=purchase_date_pst_pdt.tz_localize(None).to_pydatetime(),
            order_status=data.get('order_status'),
            fulfillment_channel=data.get('fulfillment_channel'),
            sales_channel=data.get('sales_channel'),
            sku=data.get('sku'),
            item_status=data.get('item_status'),
            quantity=data.get('quantity'),
            currency=data.get('currency'),
            item_price=data.get('item_price'),
            item_tax=data.get('item_tax'),
            shipping_price=data.get('shipping_price'),
            shipping_tax=data.get('shipping_tax'),
            gift_wrap_price=data.get('gift_wrap_price'),
            gift_wrap_tax=data.get('gift_wrap_tax'),
            item_promotion_discount=data.get('item_promotion_discount'),
            ship_promotion_discount=data.get('ship_promotion_discount')
        )
        
        db.session.add(new_order)
        db.session.commit()
        
        return jsonify({
            'message': 'Amazon order created successfully!',
            'order': new_order.to_dict()
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error creating order: {str(e)}'}), 500

# Bulk create Amazon orders
@app.route('/amazon/all-orders/bulk-create', methods=['POST'])
def bulk_create_amazon_orders():
    data = request.json
    
    if not data or not isinstance(data, list):
        return jsonify({'error': 'Expected a list of orders.'}), 400
    
    if len(data) == 0:
        return jsonify({'message': 'No orders to create.'}), 200
    
    created_orders = []
    error_records = []
    
    try:
        # Process all records in a single transaction for efficiency
        for index, record in enumerate(data):
            try:
                # Handle purchase_date_utc conversion
                purchase_date_utc = pd.to_datetime(record.get('purchase_date_utc'), errors='coerce', utc=True)
                if pd.isna(purchase_date_utc):
                    error_records.append({
                        'index': index,
                        'record': record,
                        'error': 'Invalid purchase_date_utc format. Expected format: 2024-04-30T22:51:10+00:00'
                    })
                    continue
                
                # Generate purchase_date_pst_pdt automatically
                purchase_date_pst_pdt = purchase_date_utc.tz_convert('US/Pacific')
                
                # Create a new AmazonAllOrders instance
                new_order = AmazonAllOrders(
                    amazon_order_id=record.get('amazon_order_id'),
                    purchase_date_utc=purchase_date_utc.tz_convert('UTC').tz_localize(None).to_pydatetime(),
                    purchase_date_pst_pdt=purchase_date_pst_pdt.tz_localize(None).to_pydatetime(),
                    order_status=record.get('order_status'),
                    fulfillment_channel=record.get('fulfillment_channel'),
                    sales_channel=record.get('sales_channel'),
                    sku=record.get('sku'),
                    item_status=record.get('item_status'),
                    quantity=record.get('quantity'),
                    currency=record.get('currency'),
                    item_price=record.get('item_price'),
                    item_tax=record.get('item_tax'),
                    shipping_price=record.get('shipping_price'),
                    shipping_tax=record.get('shipping_tax'),
                    gift_wrap_price=record.get('gift_wrap_price'),
                    gift_wrap_tax=record.get('gift_wrap_tax'),
                    item_promotion_discount=record.get('item_promotion_discount'),
                    ship_promotion_discount=record.get('ship_promotion_discount')
                )
                
                db.session.add(new_order)
                created_orders.append(new_order)
            except Exception as e:
                error_records.append({
                    'index': index,
                    'record': record,
                    'error': str(e)
                })
        
        # Commit all successfully processed records at once
        if created_orders:
            db.session.commit()
            
        # Return summary of the operation
        return jsonify({
            'message': f'Bulk upload completed. {len(created_orders)} records created successfully, {len(error_records)} failed.',
            'created_count': len(created_orders),
            'error_count': len(error_records),
            'errors': error_records[:10] if error_records else []  # Limit to first 10 errors
        }), 201 if created_orders else 400
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error in bulk operation: {str(e)}'}), 500

# Read all Amazon orders
@app.route('/amazon/all-orders', methods=['GET'])
def get_amazon_all_orders():
    orders = AmazonAllOrders.query.all()
    return jsonify([order.to_dict() for order in orders])

# Read filtered Amazon orders
@app.route('/amazon/all-orders/filter', methods=['GET'])
def get_filtered_amazon_all_orders():
    query = AmazonAllOrders.query
    conditions = []
    
    if 'amazon_order_id' in request.args:
        order_id_filter = request.args.get('amazon_order_id')
        conditions.append(AmazonAllOrders.amazon_order_id.ilike(f"%{order_id_filter}%"))
    
    if 'sku' in request.args:
        sku_filter = request.args.get('sku')
        conditions.append(AmazonAllOrders.sku.ilike(f"%{sku_filter}%"))
    
    if 'order_status' in request.args:
        status_filter = request.args.get('order_status')
        conditions.append(AmazonAllOrders.order_status.ilike(f"%{status_filter}%"))
    
    if 'fulfillment_channel' in request.args:
        channel_filter = request.args.get('fulfillment_channel')
        conditions.append(AmazonAllOrders.fulfillment_channel.ilike(f"%{channel_filter}%"))
    
    if 'start_date' in request.args and request.args.get('start_date'):
        try:
            start_date = datetime.strptime(request.args.get('start_date'), "%Y-%m-%d")
            conditions.append(AmazonAllOrders.purchase_date_pst_pdt >= start_date)
        except ValueError:
            return jsonify({'error': 'Invalid start_date format. Use YYYY-MM-DD.'}), 400
    
    if 'end_date' in request.args and request.args.get('end_date'):
        try:
            end_date = datetime.strptime(request.args.get('end_date'), "%Y-%m-%d")
            conditions.append(AmazonAllOrders.purchase_date_pst_pdt <= end_date)
        except ValueError:
            return jsonify({'error': 'Invalid end_date format. Use YYYY-MM-DD.'}), 400
    
    if conditions:
        query = query.filter(and_(*conditions))
    
    orders = query.all()
    
    if not orders:
        return jsonify([])
    
    return jsonify([order.to_dict() for order in orders])

# Delete one or multiple Amazon orders
@app.route('/amazon/all-orders/delete', methods=['DELETE'])
def delete_amazon_all_orders():
    selected_records = request.json.get('selected_records', [])
    
    if not selected_records:
        return jsonify({'error': 'No records selected for deletion.'}), 400
    
    # Initialize response containers
    success_deletes = []
    failed_deletes = []
    
    for selected_record in selected_records:
        record_id = selected_record.get('id')
        
        # Query the matching record
        record_to_delete = AmazonAllOrders.query.get(record_id)
        
        if not record_to_delete:
            failed_deletes.append({
                'id': record_id,
                'error': 'Record not found in Amazon All Orders.'
            })
            continue
        
        # Delete the record
        db.session.delete(record_to_delete)
        success_deletes.append({
            'id': record_id,
            'message': 'Record deleted successfully.'
        })
    
    # Commit the transaction if there are successful deletes
    try:
        if success_deletes:
            db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error occurred during deletion: {str(e)}'}), 500
    
    # Return the response with details for both successful and failed deletes
    return jsonify({
        'success_deletes': success_deletes,
        'failed_deletes': failed_deletes
    })

# Delete all Amazon orders
@app.route('/amazon/all-orders/delete-all', methods=['DELETE'])
def delete_all_amazon_orders():
    """Delete all Amazon order records"""
    try:
        count = AmazonAllOrders.query.count()
        AmazonAllOrders.query.delete()
        db.session.commit()
        return jsonify({'message': f'Successfully deleted all {count} Amazon order records'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error occurred during deletion: {str(e)}'}), 500

# ---------------------------------------------------------------------------------------------------------------
# SKUEconomics CRUD Operations                                                                                   |
# ---------------------------------------------------------------------------------------------------------------

# Create new SKU Economics record
@app.route('/amazon/sku-economics/create', methods=['POST'])
def create_sku_economics():
    data = request.json
    
    if not data:
        return jsonify({'error': 'No data provided.'}), 400
    
    # Handle date conversions
    try:
        # Input format example: 4/1/2024
        start_date_pst_pdt = pd.to_datetime(data.get('start_date_pst_pdt'), format='%m/%d/%Y').date()
        end_date_pst_pdt = pd.to_datetime(data.get('end_date_pst_pdt'), format='%m/%d/%Y').date()
    except Exception as e:
        return jsonify({'error': f'Error processing dates: {str(e)}. Expected format: M/D/YYYY (e.g., 4/1/2024)'}), 400
    
    # Create a new SKUEconomics instance
    try:
        new_economics = SKUEconomics(
            amazon_store=data.get('amazon_store'),
            start_date_pst_pdt=start_date_pst_pdt,
            end_date_pst_pdt=end_date_pst_pdt,
            msku=data.get('MSKU'),
            currency_code=data.get('currency_code'),
            fba_fulfillment_fees_total=data.get('FBA_fulfillment_fees_total'),
            sponsored_products_charge_total=data.get('sponsored_products_charge_total'),
            monthly_inventory_storage_fee_total=data.get('monthly_inventory_storage_fee_total'),
            inbound_transportation_charge_total=data.get('inbound_transportation_charge_total')
        )
        
        db.session.add(new_economics)
        db.session.commit()
        
        return jsonify({
            'message': 'SKU Economics record created successfully!',
            'sku_economics': new_economics.to_dict()
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error creating SKU Economics record: {str(e)}'}), 500

# Bulk create SKU Economics data
@app.route('/amazon/sku-economics/bulk-create', methods=['POST'])
def bulk_create_sku_economics():
    data = request.json
    
    if not data or not isinstance(data, list):
        return jsonify({'error': 'Expected a list of SKU economics records.'}), 400
    
    if len(data) == 0:
        return jsonify({'message': 'No SKU economics records to create.'}), 200
    
    created_records = []
    error_records = []
    
    try:
        # Process all records in a single transaction for efficiency
        for index, record in enumerate(data):
            try:
                # Handle date conversions
                start_date = pd.to_datetime(record.get('start_date_pst_pdt'), format='%m/%d/%Y').date()
                end_date = pd.to_datetime(record.get('end_date_pst_pdt'), format='%m/%d/%Y').date()
                
                if pd.isna(start_date) or pd.isna(end_date):
                    error_records.append({
                        'index': index,
                        'record': record,
                        'error': 'Invalid date format. Expected format: YYYY-MM-DD'
                    })
                    continue
                
                # Create a new SKUEconomics instance
                new_record = SKUEconomics(
                    amazon_store=record.get('amazon_store'),
                    start_date_pst_pdt=start_date,
                    end_date_pst_pdt=end_date,
                    msku=record.get('MSKU'),
                    currency_code=record.get('currency_code'),
                    fba_fulfillment_fees_total=record.get('FBA_fulfillment_fees_total'),
                    sponsored_products_charge_total=record.get('sponsored_products_charge_total'),
                    monthly_inventory_storage_fee_total=record.get('monthly_inventory_storage_fee_total'),
                    inbound_transportation_charge_total=record.get('inbound_transportation_charge_total')
                )
                
                db.session.add(new_record)
                created_records.append(new_record)
            except Exception as e:
                error_records.append({
                    'index': index,
                    'record': record,
                    'error': str(e)
                })
        
        # Commit all successfully processed records at once
        if created_records:
            db.session.commit()
            
        # Return summary of the operation
        return jsonify({
            'message': f'Bulk upload completed. {len(created_records)} SKU economics records created successfully, {len(error_records)} failed.',
            'created_count': len(created_records),
            'error_count': len(error_records),
            'errors': error_records[:10] if error_records else []  # Limit to first 10 errors
        }), 201 if created_records else 400
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error in bulk operation: {str(e)}'}), 500

# Read all SKU Economics
@app.route('/amazon/sku-economics', methods=['GET'])
def get_sku_economics():
    economics = SKUEconomics.query.all()
    return jsonify([econ.to_dict() for econ in economics])

# Read filtered SKU Economics
@app.route('/amazon/sku-economics/filter', methods=['GET'])
def get_filtered_sku_economics():
    query = SKUEconomics.query
    conditions = []
    
    if 'amazon_store' in request.args:
        store_filter = request.args.get('amazon_store')
        conditions.append(SKUEconomics.amazon_store.ilike(f"%{store_filter}%"))
    
    if 'MSKU' in request.args:
        msku_filter = request.args.get('MSKU')
        conditions.append(SKUEconomics.msku.ilike(f"%{msku_filter}%"))
    
    if 'currency_code' in request.args:
        currency_filter = request.args.get('currency_code')
        conditions.append(SKUEconomics.currency_code.ilike(f"%{currency_filter}%"))
    
    if 'start_date' in request.args and request.args.get('start_date'):
        try:
            start_date = datetime.strptime(request.args.get('start_date'), "%Y-%m-%d").date()
            conditions.append(SKUEconomics.start_date_pst_pdt >= start_date)
        except ValueError:
            return jsonify({'error': 'Invalid start_date format. Use YYYY-MM-DD.'}), 400
    
    if 'end_date' in request.args and request.args.get('end_date'):
        try:
            end_date = datetime.strptime(request.args.get('end_date'), "%Y-%m-%d").date()
            conditions.append(SKUEconomics.end_date_pst_pdt <= end_date)
        except ValueError:
            return jsonify({'error': 'Invalid end_date format. Use YYYY-MM-DD.'}), 400
    
    if conditions:
        query = query.filter(and_(*conditions))
    
    economics = query.all()
    
    if not economics:
        return jsonify([])
    
    return jsonify([econ.to_dict() for econ in economics])

# Delete one or multiple SKU Economics
@app.route('/amazon/sku-economics/delete', methods=['DELETE'])
def delete_sku_economics():
    selected_records = request.json.get('selected_records', [])
    
    if not selected_records:
        return jsonify({'error': 'No records selected for deletion.'}), 400
    
    # Initialize response containers
    success_deletes = []
    failed_deletes = []
    
    for selected_record in selected_records:
        record_id = selected_record.get('id')
        
        # Query the matching record
        record_to_delete = SKUEconomics.query.get(record_id)
        
        if not record_to_delete:
            failed_deletes.append({
                'id': record_id,
                'error': 'Record not found in SKU Economics.'
            })
            continue
        
        # Delete the record
        db.session.delete(record_to_delete)
        success_deletes.append({
            'id': record_id,
            'message': 'Record deleted successfully.'
        })
    
    # Commit the transaction if there are successful deletes
    try:
        if success_deletes:
            db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error occurred during deletion: {str(e)}'}), 500
    
    # Return the response with details for both successful and failed deletes
    return jsonify({
        'success_deletes': success_deletes,
        'failed_deletes': failed_deletes
    })

# Delete all SKU Economics records
@app.route('/amazon/sku-economics/delete-all', methods=['DELETE'])
def delete_all_sku_economics():
    """Delete all SKU Economics records"""
    try:
        count = SKUEconomics.query.count()
        SKUEconomics.query.delete()
        db.session.commit()
        return jsonify({'message': f'Successfully deleted all {count} SKU Economics records'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error occurred during deletion: {str(e)}'}), 500

# ---------------------------------------------------------------------------------------------------------------
# AmazonStatements CRUD Operations                                                                               |
# ---------------------------------------------------------------------------------------------------------------

# Create new Amazon Statement
@app.route('/amazon/statements/create', methods=['POST'])
def create_amazon_statement():
    data = request.json
    
    if not data:
        return jsonify({'error': 'No data provided.'}), 400
    
    # Handle UTC date conversions and generate PST/PDT dates
    datetime_fields = {
        'settlement_start_date_utc': 'settlement_start_date_pst_pdt',
        'settlement_end_date_utc': 'settlement_end_date_pst_pdt',
        'deposit_date_utc': 'deposit_date_pst_pdt',
        'posted_date_time_utc': 'posted_date_time_pst_pdt'
    }
    
    processed_dates = {}
    
    try:
        for utc_field, pst_pdt_field in datetime_fields.items():
            if data.get(utc_field):
                # Input format example: 11.03.2024 16:04:51 UTC
                utc_datetime = pd.to_datetime(
                    data.get(utc_field), 
                    format='%Y-%m-%d %H:%M:%S %Z', 
                    errors='coerce', 
                    utc=True
                )
                
                if pd.isna(utc_datetime):
                    return jsonify({
                        'error': f'Invalid {utc_field} format. Expected format: YYYY-MM-DD HH:MM:SS UTC'
                    }), 400
                
                # Convert to PST/PDT
                pst_pdt_datetime = utc_datetime.tz_convert('US/Pacific')
                
                # Store processed dates as naive datetimes for PostgreSQL TIMESTAMP WITHOUT TIME ZONE columns
                processed_dates[utc_field] = utc_datetime.tz_convert('UTC').tz_localize(None).to_pydatetime()
                processed_dates[pst_pdt_field] = pst_pdt_datetime.tz_localize(None).to_pydatetime()
            else:
                processed_dates[utc_field] = None
                processed_dates[pst_pdt_field] = None
    
    except Exception as e:
        return jsonify({'error': f'Error processing dates: {str(e)}'}), 400
    
    # Create a new AmazonStatements instance
    try:
        new_statement = AmazonStatements(
            settlement_id=data.get('settlement_id'),
            settlement_start_date_utc=processed_dates['settlement_start_date_utc'],
            settlement_start_date_pst_pdt=processed_dates['settlement_start_date_pst_pdt'],
            settlement_end_date_utc=processed_dates['settlement_end_date_utc'],
            settlement_end_date_pst_pdt=processed_dates['settlement_end_date_pst_pdt'],
            deposit_date_utc=processed_dates['deposit_date_utc'],
            deposit_date_pst_pdt=processed_dates['deposit_date_pst_pdt'],
            total_amount=data.get('total_amount'),
            currency=data.get('currency'),
            transaction_type=data.get('transaction_type'),
            order_id=data.get('order_id'),
            marketplace_name=data.get('marketplace_name'),
            amount_type=data.get('amount_type'),
            amount_description=data.get('amount_description'),
            amount=data.get('amount'),
            posted_date_time_utc=processed_dates['posted_date_time_utc'],
            posted_date_time_pst_pdt=processed_dates['posted_date_time_pst_pdt'],
            sku=data.get('sku'),
            quantity_purchased=data.get('quantity_purchased')
        )
        
        db.session.add(new_statement)
        db.session.commit()
        
        return jsonify({
            'message': 'Amazon statement created successfully!',
            'statement': new_statement.to_dict()
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error creating Amazon statement: {str(e)}'}), 500

# Bulk create Statements data
@app.route('/amazon/statements/bulk-create', methods=['POST'])
def bulk_create_statements():
    data = request.json
    
    if not data or not isinstance(data, list):
        return jsonify({'error': 'Expected a list of statement records.'}), 400
    
    if len(data) == 0:
        return jsonify({'message': 'No statement records to create.'}), 200
    
    created_records = []
    error_records = []
    
    try:
        # Process all records in a single transaction for efficiency
        for index, record in enumerate(data):
            try:
                # Handle UTC date conversions and generate PST/PDT dates
                datetime_fields = {
                    'settlement_start_date_utc': 'settlement_start_date_pst_pdt',
                    'settlement_end_date_utc': 'settlement_end_date_pst_pdt',
                    'deposit_date_utc': 'deposit_date_pst_pdt',
                    'posted_date_time_utc': 'posted_date_time_pst_pdt'
                }
                
                processed_dates = {}
                
                for utc_field, pst_pdt_field in datetime_fields.items():
                    if record.get(utc_field):

                        # Input format example: 11.03.2024 16:04:51 UTC
                        utc_datetime = pd.to_datetime(
                            record.get(utc_field), 
                            format='%Y-%m-%d %H:%M:%S %Z', 
                            errors='coerce', 
                            utc=True
                        )
                        
                        if pd.isna(utc_datetime):
                            return jsonify({
                                'error': f'Invalid {utc_field} format. Expected format: YYYY-MM-DD HH:MM:SS UTC'
                            }), 400
                        
                        # Convert to PST/PDT
                        pst_pdt_datetime = utc_datetime.tz_convert('US/Pacific')
                        
                        # Store processed dates as naive datetimes for PostgreSQL TIMESTAMP WITHOUT TIME ZONE columns
                        # Convert timezone-aware pandas Timestamps to naive Python datetimes
                        processed_dates[utc_field] = utc_datetime.tz_convert('UTC').tz_localize(None).to_pydatetime()
                        processed_dates[pst_pdt_field] = pst_pdt_datetime.tz_localize(None).to_pydatetime()
                    else:
                        processed_dates[utc_field] = None
                        processed_dates[pst_pdt_field] = None
                
                # Create a new AmazonStatements instance
                new_record = AmazonStatements(
                    settlement_id=record.get('settlement_id'),
                    settlement_start_date_utc=processed_dates.get('settlement_start_date_utc'),
                    settlement_start_date_pst_pdt=processed_dates.get('settlement_start_date_pst_pdt'),
                    settlement_end_date_utc=processed_dates.get('settlement_end_date_utc'),
                    settlement_end_date_pst_pdt=processed_dates.get('settlement_end_date_pst_pdt'),
                    deposit_date_utc=processed_dates.get('deposit_date_utc'),
                    deposit_date_pst_pdt=processed_dates.get('deposit_date_pst_pdt'),
                    total_amount=record.get('total_amount'),
                    currency=record.get('currency'),
                    transaction_type=record.get('transaction_type'),
                    order_id=record.get('order_id'),
                    marketplace_name=record.get('marketplace_name'),
                    amount_type=record.get('amount_type'),
                    amount_description=record.get('amount_description'),
                    amount=record.get('amount'),
                    posted_date_time_utc=processed_dates.get('posted_date_time_utc'),
                    posted_date_time_pst_pdt=processed_dates.get('posted_date_time_pst_pdt'),
                    sku=record.get('sku'),
                    quantity_purchased=record.get('quantity_purchased')
                )
                
                db.session.add(new_record)
                created_records.append(new_record)
            except Exception as e:
                error_records.append({
                    'index': index,
                    'record': record,
                    'error': str(e)
                })
        
        # Commit all successfully processed records at once
        if created_records:
            db.session.commit()
            
        # Return summary of the operation
        return jsonify({
            'message': f'Bulk upload completed. {len(created_records)} statement records created successfully, {len(error_records)} failed.',
            'created_count': len(created_records),
            'error_count': len(error_records),
            'errors': error_records[:10] if error_records else []  # Limit to first 10 errors
        }), 201 if created_records else 400
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error in bulk operation: {str(e)}'}), 500

# Read all Amazon Statements
@app.route('/amazon/statements', methods=['GET'])
def get_amazon_statements():
    statements = AmazonStatements.query.all()
    return jsonify([statement.to_dict() for statement in statements])

# Read filtered Amazon Statements
@app.route('/amazon/statements/filter', methods=['GET'])
def get_filtered_amazon_statements():
    query = AmazonStatements.query
    conditions = []
    
    if 'settlement_id' in request.args:
        settlement_id_filter = request.args.get('settlement_id')
        conditions.append(AmazonStatements.settlement_id.ilike(f"%{settlement_id_filter}%"))
    
    if 'order_id' in request.args:
        order_id_filter = request.args.get('order_id')
        conditions.append(AmazonStatements.order_id.ilike(f"%{order_id_filter}%"))
    
    if 'transaction_type' in request.args:
        transaction_type_filter = request.args.get('transaction_type')
        conditions.append(AmazonStatements.transaction_type.ilike(f"%{transaction_type_filter}%"))
    
    if 'sku' in request.args:
        sku_filter = request.args.get('sku')
        conditions.append(AmazonStatements.sku.ilike(f"%{sku_filter}%"))
    
    if 'start_date' in request.args and request.args.get('start_date'):
        try:
            start_date = datetime.strptime(request.args.get('start_date'), "%Y-%m-%d")
            conditions.append(AmazonStatements.settlement_start_date_pst_pdt >= start_date)
        except ValueError:
            return jsonify({'error': 'Invalid start_date format. Use YYYY-MM-DD.'}), 400
    
    if 'end_date' in request.args and request.args.get('end_date'):
        try:
            end_date = datetime.strptime(request.args.get('end_date'), "%Y-%m-%d")
            conditions.append(AmazonStatements.settlement_end_date_pst_pdt <= end_date)
        except ValueError:
            return jsonify({'error': 'Invalid end_date format. Use YYYY-MM-DD.'}), 400
    
    if conditions:
        query = query.filter(and_(*conditions))
    
    statements = query.all()
    
    if not statements:
        return jsonify([])
    
    return jsonify([statement.to_dict() for statement in statements])

# Delete one or multiple Amazon Statements
@app.route('/amazon/statements/delete', methods=['DELETE'])
def delete_amazon_statements():
    selected_records = request.json.get('selected_records', [])
    
    if not selected_records:
        return jsonify({'error': 'No records selected for deletion.'}), 400
    
    # Initialize response containers
    success_deletes = []
    failed_deletes = []
    
    for selected_record in selected_records:
        record_id = selected_record.get('id')
        
        # Query the matching record
        record_to_delete = AmazonStatements.query.get(record_id)
        
        if not record_to_delete:
            failed_deletes.append({
                'id': record_id,
                'error': 'Record not found in Amazon Statements.'
            })
            continue
        
        # Delete the record
        db.session.delete(record_to_delete)
        success_deletes.append({
            'id': record_id,
            'message': 'Record deleted successfully.'
        })
    
    # Commit the transaction if there are successful deletes
    try:
        if success_deletes:
            db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error occurred during deletion: {str(e)}'}), 500
    
    # Return the response with details for both successful and failed deletes
    return jsonify({
        'success_deletes': success_deletes,
        'failed_deletes': failed_deletes
    })

# Delete all Amazon Statements records
@app.route('/amazon/statements/delete-all', methods=['DELETE'])
def delete_all_amazon_statements():
    """Delete all Amazon Statements records"""
    try:
        count = AmazonStatements.query.count()
        AmazonStatements.query.delete()
        db.session.commit()
        return jsonify({'message': f'Successfully deleted all {count} Amazon Statements records'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error occurred during deletion: {str(e)}'}), 500

# ---------------------------------------------------------------------------------------------------------------
# AmazonInboundShipping CRUD Operations                                                                         |
# ---------------------------------------------------------------------------------------------------------------

# Create new Amazon Inbound Shipping record
@app.route('/amazon/inbound-shipping/create', methods=['POST'])
def create_amazon_inbound_shipping():
    data = request.json
    
    if not data:
        return jsonify({'error': 'No data provided.'}), 400
    
    # Handle date conversions
    datetime_fields = ['created_pst_pdt', 'last_updated_pst_pdt']
    processed_dates = {}
    
    try:
        for field in datetime_fields:
            if data.get(field):
                # Input format example: Mar 29, 2024, 10:50 a.m.
                # Replace a.m./p.m. with AM/PM
                date_str = data.get(field).replace('a.m.', 'AM').replace('p.m.', 'PM')
                
                # Parse the datetime
                parsed_date = pd.to_datetime(date_str, format='%b %d, %Y, %I:%M %p')
                
                if pd.isna(parsed_date):
                    return jsonify({
                        'error': f'Invalid {field} format. Expected format: Mar 29, 2024, 10:50 a.m.'
                    }), 400
                
                processed_dates[field] = parsed_date.to_pydatetime()
            else:
                processed_dates[field] = None
    
    except Exception as e:
        return jsonify({'error': f'Error processing dates: {str(e)}'}), 400
    
    # Create a new AmazonInboundShipping instance
    try:
        new_shipping = AmazonInboundShipping(
            shipment_name=data.get('shipment_name'),
            shipment_id=data.get('shipment_id'),
            created_pst_pdt=processed_dates['created_pst_pdt'],
            last_updated_pst_pdt=processed_dates['last_updated_pst_pdt'],
            ship_to=data.get('ship_to'),
            units_expected=data.get('units_expected'),
            units_located=data.get('units_located'),
            status=data.get('status'),
            amazon_partnered_carrier_cost=data.get('amazon_partnered_carrier_cost'),
            currency=data.get('currency'),
            msku=data.get('MSKU')
        )
        
        db.session.add(new_shipping)
        db.session.commit()
        
        return jsonify({
            'message': 'Amazon inbound shipping record created successfully!',
            'inbound_shipping': new_shipping.to_dict()
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error creating Amazon inbound shipping record: {str(e)}'}), 500
    
# Bulk create Inbound Shipping data
@app.route('/amazon/inbound-shipping/bulk-create', methods=['POST'])
def bulk_create_inbound_shipping():
    data = request.json
    
    if not data or not isinstance(data, list):
        return jsonify({'error': 'Expected a list of inbound shipping records.'}), 400
    
    if len(data) == 0:
        return jsonify({'message': 'No inbound shipping records to create.'}), 200
    
    created_records = []
    error_records = []
    
    try:
        # Process all records in a single transaction for efficiency
        for index, record in enumerate(data):
            try:
                # Handle date conversions
                datetime_fields = ['created_pst_pdt', 'last_updated_pst_pdt']
                processed_dates = {}
                
                for field in datetime_fields:
                    if record.get(field):
                        try:
                            # First try automatic parsing with pandas
                            parsed_date = pd.to_datetime(record.get(field), errors='coerce')
                            
                            # If the first attempt failed, try specific format
                            if pd.isna(parsed_date) and isinstance(record.get(field), str):
                                # Input format example: Mar 29, 2024, 10:50 a.m.
                                # Replace a.m./p.m. with AM/PM
                                date_str = record.get(field).replace('a.m.', 'AM').replace('p.m.', 'PM')
                                
                                # Parse the datetime
                                parsed_date = pd.to_datetime(date_str, format='%b %d, %Y, %I:%M %p')
                            
                            if pd.isna(parsed_date):
                                raise ValueError(f'Invalid {field} format. Expected format: Mar 29, 2024, 10:50 a.m. or compatible ISO format')
                            
                            processed_dates[field] = parsed_date.to_pydatetime()
                        except Exception as e:
                            raise ValueError(f'Error processing {field}: {str(e)}')
                    else:
                        processed_dates[field] = None
                
                # Create a new AmazonInboundShipping instance
                new_record = AmazonInboundShipping(
                    shipment_name=record.get('shipment_name'),
                    shipment_id=record.get('shipment_id'),
                    created_pst_pdt=processed_dates.get('created_pst_pdt'),
                    last_updated_pst_pdt=processed_dates.get('last_updated_pst_pdt'),
                    ship_to=record.get('ship_to'),
                    units_expected=record.get('units_expected'),
                    units_located=record.get('units_located'),
                    status=record.get('status'),
                    amazon_partnered_carrier_cost=record.get('amazon_partnered_carrier_cost'),
                    currency=record.get('currency'),
                    msku=record.get('MSKU')
                )
                
                db.session.add(new_record)
                created_records.append(new_record)
            except Exception as e:
                error_records.append({
                    'index': index,
                    'record': record,
                    'error': str(e)
                })
        
        # Commit all successfully processed records at once
        if created_records:
            db.session.commit()
            
        # Return summary of the operation
        return jsonify({
            'message': f'Bulk upload completed. {len(created_records)} inbound shipping records created successfully, {len(error_records)} failed.',
            'created_count': len(created_records),
            'error_count': len(error_records),
            'errors': error_records[:10] if error_records else []  # Limit to first 10 errors
        }), 201 if created_records else 400
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error in bulk operation: {str(e)}'}), 500

# Read all Amazon Inbound Shipping
@app.route('/amazon/inbound-shipping', methods=['GET'])
def get_amazon_inbound_shipping():
    shipping_data = AmazonInboundShipping.query.all()
    return jsonify([data.to_dict() for data in shipping_data])

# Read filtered Amazon Inbound Shipping
@app.route('/amazon/inbound-shipping/filter', methods=['GET'])
def get_filtered_amazon_inbound_shipping():
    query = AmazonInboundShipping.query
    conditions = []
    
    if 'shipment_id' in request.args:
        shipment_id_filter = request.args.get('shipment_id')
        conditions.append(AmazonInboundShipping.shipment_id.ilike(f"%{shipment_id_filter}%"))
    
    if 'shipment_name' in request.args:
        shipment_name_filter = request.args.get('shipment_name')
        conditions.append(AmazonInboundShipping.shipment_name.ilike(f"%{shipment_name_filter}%"))
    
    if 'MSKU' in request.args:
        msku_filter = request.args.get('MSKU')
        conditions.append(AmazonInboundShipping.msku.ilike(f"%{msku_filter}%"))
    
    if 'status' in request.args:
        status_filter = request.args.get('status')
        conditions.append(AmazonInboundShipping.status.ilike(f"%{status_filter}%"))
    
    if 'start_date' in request.args and request.args.get('start_date'):
        try:
            start_date = datetime.strptime(request.args.get('start_date'), "%Y-%m-%d")
            conditions.append(AmazonInboundShipping.created_pst_pdt >= start_date)
        except ValueError:
            return jsonify({'error': 'Invalid start_date format. Use YYYY-MM-DD.'}), 400
    
    if 'end_date' in request.args and request.args.get('end_date'):
        try:
            end_date = datetime.strptime(request.args.get('end_date'), "%Y-%m-%d")
            conditions.append(AmazonInboundShipping.created_pst_pdt <= end_date)
        except ValueError:
            return jsonify({'error': 'Invalid end_date format. Use YYYY-MM-DD.'}), 400
    
    if conditions:
        query = query.filter(and_(*conditions))
    
    shipping_data = query.all()
    
    if not shipping_data:
        return jsonify([])
    
    return jsonify([data.to_dict() for data in shipping_data])

# Delete one or multiple Amazon Inbound Shipping records
@app.route('/amazon/inbound-shipping/delete', methods=['DELETE'])
def delete_amazon_inbound_shipping():
    selected_records = request.json.get('selected_records', [])
    
    if not selected_records:
        return jsonify({'error': 'No records selected for deletion.'}), 400
    
    # Initialize response containers
    success_deletes = []
    failed_deletes = []
    
    for selected_record in selected_records:
        record_id = selected_record.get('id')
        
        # Query the matching record
        record_to_delete = AmazonInboundShipping.query.get(record_id)
        
        if not record_to_delete:
            failed_deletes.append({
                'id': record_id,
                'error': 'Record not found in Amazon Inbound Shipping.'
            })
            continue
        
        # Delete the record
        db.session.delete(record_to_delete)
        success_deletes.append({
            'id': record_id,
            'message': 'Record deleted successfully.'
        })
    
    # Commit the transaction if there are successful deletes
    try:
        if success_deletes:
            db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error occurred during deletion: {str(e)}'}), 500
    
    # Return the response with details for both successful and failed deletes
    return jsonify({
        'success_deletes': success_deletes,
        'failed_deletes': failed_deletes
    })

# Delete all Amazon Inbound Shipping records
@app.route('/amazon/inbound-shipping/delete-all', methods=['DELETE'])
def delete_all_amazon_inbound_shipping():
    """Delete all Amazon Inbound Shipping records"""
    try:
        count = AmazonInboundShipping.query.count()
        AmazonInboundShipping.query.delete()
        db.session.commit()
        return jsonify({'message': f'Successfully deleted all {count} Amazon Inbound Shipping records'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error occurred during deletion: {str(e)}'}), 500

# ---------------------------------------------------------------------------------------------------------------
# FBMShippingCost CRUD Operations                                                                                |
# ---------------------------------------------------------------------------------------------------------------

@app.route('/amazon/fbm-shipping-cost/bulk-create', methods=['POST'])
def bulk_create_fbm_shipping_cost():
    data = request.json
    
    if not data or not isinstance(data, list):
        return jsonify({'error': 'Expected a list of FBM shipping cost records.'}), 400
    
    if len(data) == 0:
        return jsonify({'message': 'No FBM shipping cost records to create.'}), 200
    
    created_records = []
    error_records = []
    
    # Helper function to handle scientific notation in IDs
    def parse_id_value(value):
        if value is None:
            return None
        
        # Handle potential scientific notation
        try:
            if isinstance(value, str) and ('e' in value.lower() or 'E' in value):
                # Parse as float and convert to string without scientific notation
                float_val = float(value)
                return f"{float_val:.0f}"  # Convert to string without decimal places
            return str(value)  # Ensure it's a string
        except (ValueError, TypeError):
            return value  # Return original if conversion fails
    
    try:
        # Process all records in a single transaction for efficiency
        for index, record in enumerate(data):
            try:
                # Get order_id and shipping_id, handling scientific notation
                order_id = parse_id_value(record.get('order_id'))
                shipping_id = parse_id_value(record.get('shipping_id'))
                
                # Validate required fields
                if not order_id:
                    raise ValueError("order_id is required and cannot be null")
                if not shipping_id:
                    raise ValueError("shipping_id is required and cannot be null")
                if record.get('shipping_cost') is None:
                    raise ValueError("shipping_cost is required and cannot be null")
                if record.get('warehouse_cost') is None:
                    raise ValueError("warehouse_cost is required and cannot be null")
                
                # Handle payment_date - skip invalid format
                payment_date_raw = record.get('payment_date')
                payment_date = None
                if payment_date_raw:
                    try:
                        payment_date = datetime.fromisoformat(payment_date_raw)
                    except Exception:
                        pass  
                
                # Create a new FBMShippingCost instance
                new_record = FBMShippingCost(
                    order_id=order_id,
                    shipping_id=shipping_id,
                    shipping_cost=record.get('shipping_cost'),
                    warehouse_cost=record.get('warehouse_cost'),
                    source=record.get('source'),
                    payment_date=payment_date
                )
                
                db.session.add(new_record)
                created_records.append(new_record)
            except Exception as e:
                error_records.append({
                    'index': index,
                    'record': record,
                    'error': str(e)
                })
        
        # Commit all successfully processed records at once
        if created_records:
            db.session.commit()
            
        # Return summary of the operation
        return jsonify({
            'message': f'Bulk upload completed. {len(created_records)} FBM shipping cost records created successfully, {len(error_records)} failed.',
            'created_count': len(created_records),
            'error_count': len(error_records),
            'errors': error_records[:10] if error_records else []  # Limit to first 10 errors
        }), 201 if created_records else 400
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error in bulk operation: {str(e)}'}), 500

# Read all FBM Shipping Cost
@app.route('/amazon/fbm-shipping-cost', methods=['GET'])
def get_amazon_fbm_shipping_cost():
    fbm_shipping_cost_data = FBMShippingCost.query.all()
    return jsonify([data.to_dict() for data in fbm_shipping_cost_data])

# Delete one or multiple FBM Shipping Cost records
@app.route('/amazon/fbm-shipping-cost/delete', methods=['DELETE'])
def delete_amazon_fbm_shipping_cost():
    selected_records = request.json.get('selected_records', [])
    
    if not selected_records:
        return jsonify({'error': 'No records selected for deletion.'}), 400
    
    # Initialize response containers
    success_deletes = []
    failed_deletes = []
    
    for selected_record in selected_records:
        record_id = selected_record.get('id')
        
        # Query the matching record
        record_to_delete = FBMShippingCost.query.get(record_id)
        
        if not record_to_delete:
            failed_deletes.append({
                'id': record_id,
                'error': 'Record not found in FBM Shipping Cost.'
            })
            continue
        
        # Delete the record
        db.session.delete(record_to_delete)
        success_deletes.append({
            'id': record_id,
            'message': 'Record deleted successfully.'
        })
    
    # Commit the transaction if there are successful deletes
    try:
        if success_deletes:
            db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error occurred during deletion: {str(e)}'}), 500
    
    # Return the response with details for both successful and failed deletes
    return jsonify({
        'success_deletes': success_deletes,
        'failed_deletes': failed_deletes
    })

# Delete all FBM Shipping Cost records
@app.route('/amazon/fbm-shipping-cost/delete-all', methods=['DELETE'])
def delete_all_amazon_fbm_shipping_cost():
    """Delete all FBM Shipping Cost records"""
    try:
        count = FBMShippingCost.query.count()
        FBMShippingCost.query.delete()
        db.session.commit()
        return jsonify({'message': f'Successfully deleted all {count} FBM Shipping Cost records'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error occurred during deletion: {str(e)}'}), 500

# ---------------------------------------------------------------------------------------------------------------
# Latest Record Endpoints                                                                                       |
# ---------------------------------------------------------------------------------------------------------------

@app.route('/amazon/all-orders/latest', methods=['GET'])
def get_latest_amazon_order():
    """
    Get the latest Amazon order record
    Returns the order record with the most recent purchase date
    """
    query = """
    select amazon_order_id, purchase_date_pst_pdt
    from amazonallorders
    order by purchase_date_pst_pdt DESC, amazon_order_id DESC, sku DESC
    limit 1
    """
    
    result = db.session.execute(text(query)).fetchone()
    
    if not result:
        return jsonify({'error': 'No Amazon orders found'}), 404
    
    # Format the date as a string if it exists
    if result[1]:
        # Handle different date formats from PostgreSQL
        purchase_date_str = str(result[1])
        if 'T' in purchase_date_str:
            purchase_date = purchase_date_str.replace("T", " ")
            if '.' in purchase_date:
                purchase_date = purchase_date.split('.')[0]
        else:
            purchase_date = purchase_date_str
    else:
        purchase_date = None
    
    # Convert result to dictionary
    latest_order = {
        'amazon_order_id': result[0],
        'purchase_date_pst_pdt': purchase_date,
    }
    
    return jsonify(latest_order)

@app.route('/amazon/sku-economics/latest', methods=['GET'])
def get_latest_sku_economics():
    """
    Get the latest SKU Economics record
    Returns the SKU Economics record with the most recent end date
    """
    query = """
    select start_date_pst_pdt, end_date_pst_pdt
    from skueconomics
    order by end_date_pst_pdt DESC, start_date_pst_pdt DESC, msku DESC
    limit 1
    """
    
    result = db.session.execute(text(query)).fetchone()
    
    if not result:
        return jsonify({'error': 'No SKU Economics records found'}), 404
    
    # Format the dates as strings if they exist (date only, no time)
    start_date = result[0].strftime('%Y-%m-%d') if result[0] else None
    end_date = result[1].strftime('%Y-%m-%d') if result[1] else None
    
    # Convert result to dictionary
    latest_sku_economics = {
        'start_date_pst_pdt': start_date,
        'end_date_pst_pdt': end_date
    }
    
    return jsonify(latest_sku_economics)

@app.route('/amazon/inbound-shipping/latest', methods=['GET'])
def get_latest_inbound_shipping():
    """
    Get the latest Amazon Inbound Shipping record
    Returns the Inbound Shipping record with the most recent creation date
    """
    query = """
    select shipment_id, created_pst_pdt
    from amazoninboundshipping
    order by created_pst_pdt DESC, shipment_id DESC, msku DESC
    limit 1
    """
    
    result = db.session.execute(text(query)).fetchone()
    
    if not result:
        return jsonify({'error': 'No Inbound Shipping records found'}), 404
    
    # Format the date as a string if it exists
    if result[1]:
        created_date_str = str(result[1])
        if 'T' in created_date_str:
            created_date = created_date_str.replace("T", " ")
            if '.' in created_date:
                created_date = created_date.split('.')[0]
        else:
            created_date = created_date_str
    else:
        created_date = None
    
    # Convert result to dictionary
    latest_shipping = {
        'shipment_id': result[0],
        'created_pst_pdt': created_date
    }
    
    return jsonify(latest_shipping)

@app.route('/amazon/statements/latest', methods=['GET'])
def get_latest_statement():
    """
    Get the latest Amazon Statement record
    Returns the Statement record with the most recent deposit date
    """
    query = """
    select settlement_id, settlement_start_date_pst_pdt, settlement_end_date_pst_pdt, total_amount
    from amazonstatements
    where deposit_date_utc is not null
    order by deposit_date_pst_pdt DESC, settlement_id DESC
    limit 1
    """
    
    result = db.session.execute(text(query)).fetchone()
    
    if not result:
        return jsonify({'error': 'No Statement records found'}), 404
    
    # Format the dates as strings if they exist
    if result[1]:
        start_date_str = str(result[1])
        if 'T' in start_date_str:
            start_date = start_date_str.replace("T", " ").split(' ')[0]
        else:
            start_date = start_date_str
    else:
        start_date = None
        
    if result[2]:
        end_date_str = str(result[2])
        if 'T' in end_date_str:
            end_date = end_date_str.replace("T", " ").split(' ')[0]
        else:
            end_date = end_date_str
    else:
        end_date = None
    
    # Convert result to dictionary
    latest_statement = {
        'settlement_id': result[0],
        'settlement_start_date_pst_pdt': start_date,
        'settlement_end_date_pst_pdt': end_date,
        'total_amount': str(result[3]) if result[3] else '0',
    }
    
    return jsonify(latest_statement)

# ---------------------------------------------------------------------------------------------------------------
# AdsSpendByDay CRUD Operations                                                                                 |
# ---------------------------------------------------------------------------------------------------------------

# Create new Ad Spend by Day record
@app.route('/amazon/ads-spend-by-day/create', methods=['POST'])
def create_ads_spend_by_day():
    data = request.json
    
    if not data:
        return jsonify({'error': 'No data provided.'}), 400
    
    # Handle date conversion
    try:
        # Input format can be various, try to parse automatically
        date_by_day = pd.to_datetime(data.get('date_by_day'), errors='coerce').date()
        if pd.isna(date_by_day):
            return jsonify({'error': 'Invalid date_by_day format. Please provide a valid date.'}), 400
    except Exception as e:
        return jsonify({'error': f'Error processing date: {str(e)}'}), 400
    
    # Create a new AdsSpendByDay instance
    try:
        new_ad_spend = AdsSpendByDay(
            date_by_day=date_by_day,
            sku=data.get('sku'),
            spend=data.get('spend')
        )
        
        db.session.add(new_ad_spend)
        db.session.commit()
        
        return jsonify({
            'message': 'Ad spend by day record created successfully!',
            'ad_spend': new_ad_spend.to_dict()
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error creating ad spend record: {str(e)}'}), 500

# Bulk create Ad Spend by Day data
@app.route('/amazon/ads-spend-by-day/bulk-create', methods=['POST'])
def bulk_create_ads_spend_by_day():
    data = request.json
    
    if not data or not isinstance(data, list):
        return jsonify({'error': 'Expected a list of ad spend records.'}), 400
    
    if len(data) == 0:
        return jsonify({'message': 'No ad spend records to create.'}), 200
    
    created_records = []
    error_records = []
    
    try:
        # Prepare records for bulk insert
        valid_records = []
        
        # Process all records and validate them first
        for index, record in enumerate(data):
            try:
                # Handle date conversion - preserve exact date without timezone issues
                date_str = record.get('date_by_day')
                if not date_str:
                    error_records.append({
                        'index': index,
                        'record': record,
                        'error': 'date_by_day is required and cannot be empty.'
                    })
                    continue
                
                try:
                    # Parse date and convert to date object to avoid timezone issues
                    date_by_day = pd.to_datetime(date_str, errors='raise').date()
                except Exception:
                    error_records.append({
                        'index': index,
                        'record': record,
                        'error': f'Invalid date_by_day format: {date_str}. Please provide a valid date (YYYY-MM-DD or MM/DD/YYYY).'
                    })
                    continue
                
                # Validate required fields
                if not record.get('sku'):
                    error_records.append({
                        'index': index,
                        'record': record,
                        'error': 'SKU is required and cannot be empty.'
                    })
                    continue
                
                # Prepare record for bulk insert
                valid_record = {
                    'date_by_day': date_by_day,
                    'sku': record.get('sku'),
                    'spend': record.get('spend') if record.get('spend') is not None else 0
                }
                valid_records.append(valid_record)
                
            except Exception as e:
                error_records.append({
                    'index': index,
                    'record': record,
                    'error': str(e)
                })
        
        # Perform bulk insert if we have valid records
        if valid_records:
            db.session.execute(
                AdsSpendByDay.__table__.insert(),
                valid_records
            )
            db.session.commit()
            created_records = valid_records  # For count purposes
            
        # Return summary of the operation
        return jsonify({
            'message': f'Bulk upload completed. {len(created_records)} ad spend records created successfully, {len(error_records)} failed.',
            'created_count': len(created_records),
            'error_count': len(error_records),
            'errors': error_records[:10] if error_records else []  # Limit to first 10 errors
        }), 201 if created_records else 400
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error in bulk operation: {str(e)}'}), 500

# Read all Ad Spend by Day
@app.route('/amazon/ads-spend-by-day', methods=['GET'])
def get_ads_spend_by_day():
    ad_spends = AdsSpendByDay.query.all()
    return jsonify([ad_spend.to_dict() for ad_spend in ad_spends])

# Read filtered Ad Spend by Day
@app.route('/amazon/ads-spend-by-day/filter', methods=['GET'])
def get_filtered_ads_spend_by_day():
    query = AdsSpendByDay.query
    conditions = []
    
    if 'sku' in request.args:
        sku_filter = request.args.get('sku')
        conditions.append(AdsSpendByDay.sku.ilike(f"%{sku_filter}%"))
    
    if 'start_date' in request.args and request.args.get('start_date'):
        try:
            start_date = datetime.strptime(request.args.get('start_date'), "%Y-%m-%d").date()
            conditions.append(AdsSpendByDay.date_by_day >= start_date)
        except ValueError:
            return jsonify({'error': 'Invalid start_date format. Use YYYY-MM-DD.'}), 400
    
    if 'end_date' in request.args and request.args.get('end_date'):
        try:
            end_date = datetime.strptime(request.args.get('end_date'), "%Y-%m-%d").date()
            conditions.append(AdsSpendByDay.date_by_day <= end_date)
        except ValueError:
            return jsonify({'error': 'Invalid end_date format. Use YYYY-MM-DD.'}), 400
    
    if conditions:
        query = query.filter(and_(*conditions))
    
    ad_spends = query.all()
    
    if not ad_spends:
        return jsonify([])
    
    return jsonify([ad_spend.to_dict() for ad_spend in ad_spends])

# Delete one or multiple Ad Spend by Day records
@app.route('/amazon/ads-spend-by-day/delete', methods=['DELETE'])
def delete_ads_spend_by_day():
    selected_records = request.json.get('selected_records', [])
    
    if not selected_records:
        return jsonify({'error': 'No records selected for deletion.'}), 400
    
    # Initialize response containers
    success_deletes = []
    failed_deletes = []
    
    for selected_record in selected_records:
        record_id = selected_record.get('id')
        
        # Query the matching record
        record_to_delete = AdsSpendByDay.query.get(record_id)
        
        if not record_to_delete:
            failed_deletes.append({
                'id': record_id,
                'error': 'Record not found in Ad Spend by Day.'
            })
            continue
        
        # Delete the record
        db.session.delete(record_to_delete)
        success_deletes.append({
            'id': record_id,
            'message': 'Record deleted successfully.'
        })
    
    # Commit the transaction if there are successful deletes
    try:
        if success_deletes:
            db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error occurred during deletion: {str(e)}'}), 500
    
    # Return the response with details for both successful and failed deletes
    return jsonify({
        'success_deletes': success_deletes,
        'failed_deletes': failed_deletes
    })

# Delete all Ad Spend by Day records
@app.route('/amazon/ads-spend-by-day/delete-all', methods=['DELETE'])
def delete_all_ads_spend_by_day():
    """Delete all Ad Spend by Day records"""
    try:
        count = AdsSpendByDay.query.count()
        AdsSpendByDay.query.delete()
        db.session.commit()
        return jsonify({'message': f'Successfully deleted all {count} Ad Spend by Day records'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error occurred during deletion: {str(e)}'}), 500

# Get latest Ad Spend by Day record
@app.route('/amazon/ads-spend-by-day/latest', methods=['GET'])
def get_latest_ads_spend_by_day():
    """
    Get the latest Ad Spend by Day record
    Returns the record with the most recent date
    """
    query = """
    select date_by_day, sku
    from adsspendbyday
    order by date_by_day DESC, sku DESC
    limit 1
    """
    
    result = db.session.execute(text(query)).fetchone()
    
    if not result:
        return jsonify({'error': 'No Ad Spend by Day records found'}), 404
    
    # Convert result to dictionary
    latest_ad_spend = {
        'date_by_day': result[0].strftime('%Y-%m-%d') if result[0] else None,
        'sku': result[1]
    }
    
    return jsonify(latest_ad_spend)

# ---------------------------------------------------------------------------------------------------------------
# AdsCreditCardPayment CRUD Operations                                                                         |
# ---------------------------------------------------------------------------------------------------------------

# Create new Ad Credit Card Payment record
@app.route('/amazon/ads-credit-card-payment/create', methods=['POST'])
def create_ads_credit_card_payment():
    data = request.json
    
    if not data:
        return jsonify({'error': 'No data provided.'}), 400
    
    # Handle date conversions
    try:
        # Input format can be various, try to parse automatically
        issued_on = pd.to_datetime(data.get('issued_on'), errors='coerce').date()
        due_date = pd.to_datetime(data.get('due_date'), errors='coerce').date()
        
        if pd.isna(issued_on):
            return jsonify({'error': 'Invalid issued_on date format. Please provide a valid date.'}), 400
        if pd.isna(due_date):
            return jsonify({'error': 'Invalid due_date format. Please provide a valid date.'}), 400
    except Exception as e:
        return jsonify({'error': f'Error processing dates: {str(e)}'}), 400
    
    # Create a new AdsCreditCardPayment instance
    try:
        new_payment = AdsCreditCardPayment(
            invoice_id=data.get('invoice_id'),
            issued_on=issued_on,
            due_date=due_date,
            total_amount_billed=data.get('total_amount_billed')
        )
        
        db.session.add(new_payment)
        db.session.commit()
        
        return jsonify({
            'message': 'Ad credit card payment record created successfully!',
            'payment': new_payment.to_dict()
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error creating ad credit card payment record: {str(e)}'}), 500

# Bulk create Ad Credit Card Payment data
@app.route('/amazon/ads-credit-card-payment/bulk-create', methods=['POST'])
def bulk_create_ads_credit_card_payment():
    data = request.json
    
    if not data or not isinstance(data, list):
        return jsonify({'error': 'Expected a list of ad credit card payment records.'}), 400
    
    if len(data) == 0:
        return jsonify({'message': 'No ad credit card payment records to create.'}), 200
    
    created_records = []
    error_records = []
    
    try:
        # Prepare records for bulk insert
        valid_records = []
        
        # Process all records and validate them first
        for index, record in enumerate(data):
            try:
                # Handle date conversions
                issued_on_str = record.get('issued_on')
                due_date_str = record.get('due_date')
                
                if not issued_on_str:
                    error_records.append({
                        'index': index,
                        'record': record,
                        'error': 'issued_on is required and cannot be empty.'
                    })
                    continue
                
                if not due_date_str:
                    error_records.append({
                        'index': index,
                        'record': record,
                        'error': 'due_date is required and cannot be empty.'
                    })
                    continue
                
                try:
                    # Parse dates and convert to date objects
                    issued_on = pd.to_datetime(issued_on_str, errors='raise').date()
                    due_date = pd.to_datetime(due_date_str, errors='raise').date()
                except Exception:
                    error_records.append({
                        'index': index,
                        'record': record,
                        'error': f'Invalid date format in issued_on ({issued_on_str}) or due_date ({due_date_str}). Please provide valid dates.'
                    })
                    continue
                
                # Validate required fields
                if not record.get('invoice_id'):
                    error_records.append({
                        'index': index,
                        'record': record,
                        'error': 'Invoice ID is required and cannot be empty.'
                    })
                    continue
                
                if record.get('total_amount_billed') is None:
                    error_records.append({
                        'index': index,
                        'record': record,
                        'error': 'Total amount billed is required and cannot be empty.'
                    })
                    continue
                
                # Prepare record for bulk insert
                valid_record = {
                    'invoice_id': record.get('invoice_id'),
                    'issued_on': issued_on,
                    'due_date': due_date,
                    'total_amount_billed': record.get('total_amount_billed')
                }
                valid_records.append(valid_record)
                
            except Exception as e:
                error_records.append({
                    'index': index,
                    'record': record,
                    'error': str(e)
                })
        
        # Perform bulk insert if we have valid records
        if valid_records:
            db.session.execute(
                AdsCreditCardPayment.__table__.insert(),
                valid_records
            )
            db.session.commit()
            created_records = valid_records  # For count purposes
            
        # Return summary of the operation
        return jsonify({
            'message': f'Bulk upload completed. {len(created_records)} ad credit card payment records created successfully, {len(error_records)} failed.',
            'created_count': len(created_records),
            'error_count': len(error_records),
            'errors': error_records[:10] if error_records else []  # Limit to first 10 errors
        }), 201 if created_records else 400
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error in bulk operation: {str(e)}'}), 500

# Read all Ad Credit Card Payments
@app.route('/amazon/ads-credit-card-payment', methods=['GET'])
def get_ads_credit_card_payment():
    payments = AdsCreditCardPayment.query.all()
    return jsonify([payment.to_dict() for payment in payments])

# Read filtered Ad Credit Card Payments
@app.route('/amazon/ads-credit-card-payment/filter', methods=['GET'])
def get_filtered_ads_credit_card_payment():
    query = AdsCreditCardPayment.query
    conditions = []
    
    if 'invoice_id' in request.args:
        invoice_filter = request.args.get('invoice_id')
        conditions.append(AdsCreditCardPayment.invoice_id.ilike(f"%{invoice_filter}%"))
    
    if 'start_date' in request.args and request.args.get('start_date'):
        try:
            start_date = datetime.strptime(request.args.get('start_date'), "%Y-%m-%d").date()
            conditions.append(AdsCreditCardPayment.issued_on >= start_date)
        except ValueError:
            return jsonify({'error': 'Invalid start_date format. Use YYYY-MM-DD.'}), 400
    
    if 'end_date' in request.args and request.args.get('end_date'):
        try:
            end_date = datetime.strptime(request.args.get('end_date'), "%Y-%m-%d").date()
            conditions.append(AdsCreditCardPayment.issued_on <= end_date)
        except ValueError:
            return jsonify({'error': 'Invalid end_date format. Use YYYY-MM-DD.'}), 400
    
    if conditions:
        query = query.filter(and_(*conditions))
    
    payments = query.all()
    
    if not payments:
        return jsonify([])
    
    return jsonify([payment.to_dict() for payment in payments])

# Delete one or multiple Ad Credit Card Payment records
@app.route('/amazon/ads-credit-card-payment/delete', methods=['DELETE'])
def delete_ads_credit_card_payment():
    selected_records = request.json.get('selected_records', [])
    
    if not selected_records:
        return jsonify({'error': 'No records selected for deletion.'}), 400
    
    # Initialize response containers
    success_deletes = []
    failed_deletes = []
    
    for selected_record in selected_records:
        record_id = selected_record.get('id')
        
        # Query the matching record
        record_to_delete = AdsCreditCardPayment.query.get(record_id)
        
        if not record_to_delete:
            failed_deletes.append({
                'id': record_id,
                'error': 'Record not found in Ad Credit Card Payment.'
            })
            continue
        
        # Delete the record
        db.session.delete(record_to_delete)
        success_deletes.append({
            'id': record_id,
            'message': 'Record deleted successfully.'
        })
    
    # Commit the transaction if there are successful deletes
    try:
        if success_deletes:
            db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error occurred during deletion: {str(e)}'}), 500
    
    # Return the response with details for both successful and failed deletes
    return jsonify({
        'success_deletes': success_deletes,
        'failed_deletes': failed_deletes
    })

# Delete all Ad Credit Card Payment records
@app.route('/amazon/ads-credit-card-payment/delete-all', methods=['DELETE'])
def delete_all_ads_credit_card_payment():
    """Delete all Ad Credit Card Payment records"""
    try:
        count = AdsCreditCardPayment.query.count()
        AdsCreditCardPayment.query.delete()
        db.session.commit()
        return jsonify({'message': f'Successfully deleted all {count} Ad Credit Card Payment records'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error occurred during deletion: {str(e)}'}), 500

# Get latest Ad Credit Card Payment record
@app.route('/amazon/ads-credit-card-payment/latest', methods=['GET'])
def get_latest_ads_credit_card_payment():
    """
    Get the latest Ad Credit Card Payment record
    Returns the record with the most recent issued date
    """
    query = """
    select invoice_id, issued_on
    from adscreditcardpayment
    order by issued_on DESC, invoice_id DESC
    limit 1
    """
    
    result = db.session.execute(text(query)).fetchone()
    
    if not result:
        return jsonify({'error': 'No Ad Credit Card Payment records found'}), 404
    
    # Convert result to dictionary
    latest_payment = {
        'invoice_id': result[0],
        'issued_on': result[1].strftime('%Y-%m-%d') if result[1] else None
    }
    
    return jsonify(latest_payment)

# ---------------------------------------------------------------------------------------------------------------
# QBAccountIDMapping CRUD Operations                                                                           |
# ---------------------------------------------------------------------------------------------------------------

# Create new QB Account ID Mapping record
@app.route('/qb-account-mapping/create', methods=['POST'])
def create_qb_account_mapping():
    data = request.json
    
    if not data:
        return jsonify({'error': 'No data provided.'}), 400
    
    # Create a new QBAccountIDMapping instance
    try:
        new_mapping = QBAccountIDMapping(
            statement_category=data.get('statement_category'),
            statement_pnl_items=data.get('statement_pnl_items'),
            pnl_account_name=data.get('pnl_account_name'),
            pnl_account_id=data.get('pnl_account_id'),
            bs_account_name=data.get('bs_account_name'),
            bs_account_id=data.get('bs_account_id')
        )
        
        db.session.add(new_mapping)
        db.session.commit()
        
        return jsonify({
            'message': 'QB Account ID Mapping record created successfully!',
            'mapping': new_mapping.to_dict()
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error creating QB Account ID Mapping record: {str(e)}'}), 500

# Bulk create QB Account ID Mapping data
@app.route('/qb-account-mapping/bulk-create', methods=['POST'])
def bulk_create_qb_account_mapping():
    data = request.json
    
    if not data or not isinstance(data, list):
        return jsonify({'error': 'Expected a list of QB Account ID Mapping records.'}), 400
    
    if len(data) == 0:
        return jsonify({'message': 'No QB Account ID Mapping records to create.'}), 200
    
    created_records = []
    error_records = []
    
    try:
        # Process all records in a single transaction for efficiency
        for index, record in enumerate(data):
            try:
                # Validate required fields
                if not record.get('statement_category'):
                    error_records.append({
                        'index': index,
                        'record': record,
                        'error': 'statement_category is required and cannot be empty.'
                    })
                    continue
                
                if not record.get('statement_pnl_items'):
                    error_records.append({
                        'index': index,
                        'record': record,
                        'error': 'statement_pnl_items is required and cannot be empty.'
                    })
                    continue
                
                # Create a new QBAccountIDMapping instance
                new_record = QBAccountIDMapping(
                    statement_category=record.get('statement_category'),
                    statement_pnl_items=record.get('statement_pnl_items'),
                    pnl_account_name=record.get('pnl_account_name'),
                    pnl_account_id=record.get('pnl_account_id'),
                    bs_account_name=record.get('bs_account_name'),
                    bs_account_id=record.get('bs_account_id')
                )
                
                db.session.add(new_record)
                created_records.append(new_record)
            except Exception as e:
                error_records.append({
                    'index': index,
                    'record': record,
                    'error': str(e)
                })
        
        # Commit all successfully processed records at once
        if created_records:
            db.session.commit()
            
        # Return summary of the operation
        return jsonify({
            'message': f'Bulk upload completed. {len(created_records)} QB Account ID Mapping records created successfully, {len(error_records)} failed.',
            'created_count': len(created_records),
            'error_count': len(error_records),
            'errors': error_records[:10] if error_records else []  # Limit to first 10 errors
        }), 201 if created_records else 400
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error in bulk operation: {str(e)}'}), 500

# Read all QB Account ID Mappings
@app.route('/qb-account-mapping', methods=['GET'])
def get_qb_account_mapping():
    mappings = QBAccountIDMapping.query.all()
    return jsonify([mapping.to_dict() for mapping in mappings])

# Read filtered QB Account ID Mappings
@app.route('/qb-account-mapping/filter', methods=['GET'])
def get_filtered_qb_account_mapping():
    query = QBAccountIDMapping.query
    conditions = []
    
    if 'statement_category' in request.args:
        category_filter = request.args.get('statement_category')
        conditions.append(QBAccountIDMapping.statement_category.ilike(f"%{category_filter}%"))
    
    if 'statement_pnl_items' in request.args:
        items_filter = request.args.get('statement_pnl_items')
        conditions.append(QBAccountIDMapping.statement_pnl_items.ilike(f"%{items_filter}%"))
    
    if 'pnl_account_name' in request.args:
        pnl_name_filter = request.args.get('pnl_account_name')
        conditions.append(QBAccountIDMapping.pnl_account_name.ilike(f"%{pnl_name_filter}%"))
    
    if 'bs_account_name' in request.args:
        bs_name_filter = request.args.get('bs_account_name')
        conditions.append(QBAccountIDMapping.bs_account_name.ilike(f"%{bs_name_filter}%"))
    
    if conditions:
        query = query.filter(and_(*conditions))
    
    mappings = query.all()
    
    if not mappings:
        return jsonify([])
    
    return jsonify([mapping.to_dict() for mapping in mappings])

# Delete one or multiple QB Account ID Mapping records
@app.route('/qb-account-mapping/delete', methods=['DELETE'])
def delete_qb_account_mapping():
    selected_records = request.json.get('selected_records', [])
    
    if not selected_records:
        return jsonify({'error': 'No records selected for deletion.'}), 400
    
    # Initialize response containers
    success_deletes = []
    failed_deletes = []
    
    for selected_record in selected_records:
        record_id = selected_record.get('id')
        
        # Query the matching record
        record_to_delete = QBAccountIDMapping.query.get(record_id)
        
        if not record_to_delete:
            failed_deletes.append({
                'id': record_id,
                'error': 'Record not found in QB Account ID Mapping.'
            })
            continue
        
        # Delete the record
        db.session.delete(record_to_delete)
        success_deletes.append({
            'id': record_id,
            'message': 'Record deleted successfully.'
        })
    
    # Commit the transaction if there are successful deletes
    try:
        if success_deletes:
            db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error occurred during deletion: {str(e)}'}), 500
    
    # Return the response with details for both successful and failed deletes
    return jsonify({
        'success_deletes': success_deletes,
        'failed_deletes': failed_deletes
    })

# Delete all QB Account ID Mapping records
@app.route('/qb-account-mapping/delete-all', methods=['DELETE'])
def delete_all_qb_account_mapping():
    """Delete all QB Account ID Mapping records"""
    try:
        count = QBAccountIDMapping.query.count()
        QBAccountIDMapping.query.delete()
        db.session.commit()
        return jsonify({'message': f'Successfully deleted all {count} QB Account ID Mapping records'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error occurred during deletion: {str(e)}'}), 500

# Get latest QB Account ID Mapping record
@app.route('/qb-account-mapping/latest', methods=['GET'])
def get_latest_qb_account_mapping():
    """
    Get the latest QB Account ID Mapping record
    Returns the record with the highest ID (most recently created)
    """
    query = """
    select statement_category, statement_pnl_items
    from qbaccountidmapping
    order by id DESC
    limit 1
    """
    
    result = db.session.execute(text(query)).fetchone()
    
    if not result:
        return jsonify({'error': 'No QB Account ID Mapping records found'}), 404
    
    # Convert result to dictionary
    latest_mapping = {
        'statement_category': result[0],
        'statement_pnl_items': result[1]
    }
    
    return jsonify(latest_mapping)

# ---------------------------------------------------------------------------------------------------------------
# All Orders PnL CRUD Operations                                                                               |
# ---------------------------------------------------------------------------------------------------------------

# Generate All Orders PnL
@app.route('/amazon/all-orders-pnl/generate', methods=['POST'])
def all_orders_pnl_generate():
    """Generate All Orders PnL data by running the processing script and saving results to database"""
    from backend import db
    from backend.models import AllOrdersPnL
    import pandas as pd
    import importlib.util
    import os
    import sys
    from datetime import datetime
    
    # Get the path to the script
    current_directory = os.path.dirname(os.path.abspath(__file__))
    script_path = os.path.join(current_directory, 'processing', 'PnL_Generation', 'all_orders_PnL_table.py')
    
    try:
        # Import the module from the file path
        spec = importlib.util.spec_from_file_location("all_orders_PnL_table", script_path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        
        # The script already processes the data and creates a DataFrame called all_orders_PnL
        # We can access it from the module's namespace
        all_orders_pnl_df = module.all_orders_PnL
        
        # High-performance table replacement using SQLAlchemy core bulk insert
        print(f"Replacing AllOrdersPnL table with {len(all_orders_pnl_df)} records...")
        
        # Convert DataFrame to list of dictionaries for SQLAlchemy core bulk insert
        # Handle NaN values by converting them to None and map column names to database schema
        
        # Column mapping from DataFrame names to database column names
        column_mapping = {
            'FBA_fulfillment_fee': 'fba_fulfillment_fee',
            'FBA_inbound_transportation_fee': 'fba_inbound_transportation_fee', 
            'FBA_storage_fee': 'fba_storage_fee',
            'FBM_shipping_commission': 'fbm_shipping_commission',
            'statements_FBA_fulfillment_fee': 'statements_fba_fulfillment_fee',
            'statements_FBA_storage_fee_allocated': 'statements_fba_storage_fee_allocated',
            'statements_FBM_shipping_commission': 'statements_fbm_shipping_commission',
            'returns_FBM_shipping_commission': 'returns_fbm_shipping_commission'
        }
        
        records_to_insert = []
        for _, row in all_orders_pnl_df.iterrows():
            # Convert NaN to None for database compatibility
            row_dict = row.where(pd.notnull(row), None).to_dict()
            
            # Apply column name mapping
            mapped_dict = {}
            for key, value in row_dict.items():
                mapped_key = column_mapping.get(key, key)  # Use mapping if exists, otherwise keep original
                mapped_dict[mapped_key] = value
            
            records_to_insert.append(mapped_dict)
        
        # Clear existing table and bulk insert using SQLAlchemy core (same as your 2-second bulk create endpoints)
        from sqlalchemy import text
        db.session.execute(text("DELETE FROM allorderspnl;"))
        db.session.execute(
            AllOrdersPnL.__table__.insert(),
            records_to_insert
        )
        records_created = len(records_to_insert)
        print(f"✅ Successfully bulk inserted {records_created} AllOrdersPnL records")
                
        db.session.commit()
        return jsonify({"message": f"Successfully generated {records_created} AllOrdersPnL records"}), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# Read All 
@app.route('/amazon/all-orders-pnl', methods=['GET'])
def all_orders_pnl_get_all():
    try:
        records = AllOrdersPnL.query.all()
        return jsonify({"data": [record.to_dict() for record in records]}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Delete All
@app.route('/amazon/all-orders-pnl/delete', methods=['DELETE'])
def all_orders_pnl_delete_all():
    """Delete all AllOrdersPnL records"""
    try:
        count = AllOrdersPnL.query.count()
        AllOrdersPnL.query.delete()
        db.session.commit()
        return jsonify({"message": f"Successfully deleted {count} AllOrdersPnL records"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500