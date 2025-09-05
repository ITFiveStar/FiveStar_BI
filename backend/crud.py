import os
import sys
import subprocess
current_directory = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_directory, os.pardir))
sys.path.append(project_root)

from backend import app, db
from backend.models import Customer, Supplier, PurchaseOrder, ManufactureOrder, SalesRecord, Return, ManufactureStockInitiationAddition, ManufactureResult, FailedManufactureResult, Inventory, InventoryRawMaterial, COGS, FailedCOGS, StockExchange, FailedStockExchange
from flask import request, jsonify, send_file
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy import or_, and_, text, func, desc, not_, asc, Computed
from datetime import datetime, timedelta
import pandas as pd

from werkzeug.utils import secure_filename
from bs4 import BeautifulSoup
from dotenv import dotenv_values

# ---------------------------------------------------------------------------------------------------------------
# Customers CRUD Operations                                                                                      |
# ---------------------------------------------------------------------------------------------------------------
# Create one or multiple records
@app.route('/customers', methods=['POST'])
def create_customer():
    data = request.json
    if isinstance(data, list):
        customers = []
        for record in data:
            if 'name' not in record or not record['name']:
                return jsonify({'error': 'Customer name is required for all records'}), 400
            new_customer = Customer(name=record['name'])
            db.session.add(new_customer)
            customers.append(new_customer.to_dict())
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            return jsonify({'error': 'Duplicate customer name detected (case-insensitive).'}), 400
        return jsonify({'message': 'Customers created successfully!', 'customers': customers}), 201
    else:
        if 'name' not in data or not data['name']:
            return jsonify({'error': 'Customer name is required'}), 400
        new_customer = Customer(name=data['name'])
        db.session.add(new_customer)
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            return jsonify({'error': 'Duplicate customer name detected (case-insensitive).'}), 400
        return jsonify({'message': 'Customer created successfully!', 'customer': new_customer.to_dict()}), 201

# Read all
@app.route('/customers', methods=['GET'])
def get_customers():
    customers = Customer.query.all()
    return jsonify([customer.to_dict() for customer in customers])

# Read Partial - Ambiguous Filter
@app.route('/customers/name/<string:name>', methods=['GET'])
def get_customer_by_name(name):
    customers = Customer.query.filter(Customer.name.ilike(f"%{name}%")).all()
    if not customers:
        return jsonify({'error': f'No customers found with name containing "{name}"'}), 404
    return jsonify([customer.to_dict() for customer in customers])

# Update one or multiple records
@app.route('/customers/update', methods=['PUT'])
def update_customers():
    selected_records = request.json.get('selected_records', [])
    update_data = request.json.get('update_data', {})

    if not selected_records:
        return jsonify({'error': 'No records selected for update.'}), 400

    if not isinstance(update_data, list) or len(update_data) != len(selected_records):
        return jsonify({'error': 'The update_data must be a list and match the number of selected_records.'}), 400

    # Use session.no_autoflush to prevent autoflush while querying
    with db.session.no_autoflush:
        # Build the query for selected records based on names
        query_conditions = [
            Customer.name.ilike(record['name'])
            for record in selected_records
        ]
        query = Customer.query.filter(or_(*query_conditions))

        matching_records = query.all()

        if not matching_records:
            return jsonify({'error': 'No selected records found for update.'}), 404
        
        if len(matching_records) != len(selected_records):
            # Identify the missing records
            found_names = {record.name.upper() for record in matching_records}
            missing_records = [
                record for record in selected_records
                if record['name'].upper() not in found_names
            ]
            return jsonify({
                'error': 'Some selected records were not found for update.',
                'missing_records': missing_records
            }), 404

        updated_ids = []

        for record_to_update, record_update_data in zip(matching_records, update_data):
            # Validate required fields
            if 'name' not in record_update_data or not record_update_data['name']:
                return jsonify({'error': 'Customer name is required for all records'}), 400

            # Check if the new name already exists (case-insensitive)
            new_name = record_update_data['name']
            existing_customer = Customer.query.filter(
                Customer.name.ilike(new_name),
                Customer.customer_id != record_to_update.customer_id
            ).first()

            if existing_customer:
                return jsonify({'error': f'Customer name "{new_name}" already exists (case-insensitive).'}), 400

            # Update the record
            record_to_update.name = new_name
            updated_ids.append(record_to_update.customer_id)

        try:
            db.session.commit()
        except IntegrityError as e:
            db.session.rollback()
            return jsonify({'error': f'Database error: {str(e)}'}), 500

        # Re-query updated records
        updated_records = Customer.query.filter(Customer.customer_id.in_(updated_ids)).all()

        return jsonify({'message': 'Selected customers updated successfully!', 'updated_records': [record.to_dict() for record in updated_records]})

# Delete one or multiple records
@app.route('/customers/delete', methods=['DELETE'])
def delete_customers():
    selected_records = request.json.get('selected_records', [])

    if not selected_records:
        return jsonify({'error': 'No records selected for deletion.'}), 400

    # Initialize response containers
    success_deletes = []
    failed_deletes = []

    for selected_record in selected_records:
        customer_name = selected_record.get('name', '').strip()

        # Query the matching record
        customer_to_delete = Customer.query.filter(Customer.name.ilike(customer_name)).first()

        if not customer_to_delete:
            failed_deletes.append({
                'name': customer_name,
                'error': 'Customer not found in Customers table.'
            })
            continue

        # Check for references in the SalesRecords table
        linked_records = SalesRecord.query.filter_by(customer_id=customer_to_delete.customer_id).all()

        if linked_records:
            failed_deletes.append({
                'name': customer_name,
                'error': 'Customer is referenced in the SalesRecords table and cannot be deleted.',
                'dependent_records': [record.to_dict() for record in linked_records]
            })
            continue

        # Delete the customer if no references exist
        db.session.delete(customer_to_delete)
        success_deletes.append({
            'name': customer_name,
            'message': 'Customer deleted successfully.'
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


# ---------------------------------------------------------------------------------------------------------------
# Suppliers CRUD Operations                                                                                      |
# ---------------------------------------------------------------------------------------------------------------
# Create one or multiple records
@app.route('/suppliers', methods=['POST'])
def create_supplier():
    data = request.json
    if isinstance(data, list):
        suppliers = []
        for record in data:
            if 'name' not in record or not record['name']:
                return jsonify({'error': 'Supplier name is required for all records'}), 400
            new_supplier = Supplier(name=record['name'])
            db.session.add(new_supplier)
            suppliers.append(new_supplier.to_dict())
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            return jsonify({'error': 'Duplicate supplier name detected (case-insensitive).'}), 400
        return jsonify({'message': 'Suppliers created successfully!', 'suppliers': suppliers}), 201
    else:
        if 'name' not in data or not data['name']:
            return jsonify({'error': 'Supplier name is required'}), 400
        new_supplier = Supplier(name=data['name'])
        db.session.add(new_supplier)
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            return jsonify({'error': 'Duplicate supplier name detected (case-insensitive).'}), 400
        return jsonify({'message': 'Supplier created successfully!', 'supplier': new_supplier.to_dict()}), 201

# Read all
@app.route('/suppliers', methods=['GET'])
def get_suppliers():
    suppliers = Supplier.query.all()
    return jsonify([supplier.to_dict() for supplier in suppliers])

# Read Partial - Ambiguous Filter
@app.route('/suppliers/name/<string:name>', methods=['GET'])
def get_supplier_by_name(name):
    suppliers = Supplier.query.filter(Supplier.name.ilike(f"%{name}%")).all()
    if not suppliers:
        return jsonify({'error': f'No suppliers found with name containing "{name}"'}), 404
    return jsonify([supplier.to_dict() for supplier in suppliers])

# Update one or multiple records
@app.route('/suppliers/update', methods=['PUT'])
def update_suppliers():
    selected_records = request.json.get('selected_records', [])
    update_data = request.json.get('update_data', {})

    if not selected_records:
        return jsonify({'error': 'No records selected for update.'}), 400

    if not isinstance(update_data, list) or len(update_data) != len(selected_records):
        return jsonify({'error': 'The update_data must be a list and match the number of selected_records.'}), 400

    # Use session.no_autoflush to prevent autoflush while querying
    with db.session.no_autoflush:
        # Build the query for selected records based on names
        query_conditions = [
            Supplier.name.ilike(record['name'])
            for record in selected_records
        ]
        query = Supplier.query.filter(or_(*query_conditions))

        matching_records = query.all()

        if not matching_records:
            return jsonify({'error': 'No selected records found for update.'}), 404
        
        if len(matching_records) != len(selected_records):
            # Identify the missing records
            found_names = {record.name.upper() for record in matching_records}
            missing_records = [
                record for record in selected_records
                if record['name'].upper() not in found_names
            ]
            return jsonify({
                'error': 'Some selected records were not found for update.',
                'missing_records': missing_records
            }), 404

        updated_ids = []

        for record_to_update, record_update_data in zip(matching_records, update_data):
            # Validate required fields
            if 'name' not in record_update_data or not record_update_data['name']:
                return jsonify({'error': 'Supplier name is required for all records'}), 400

            # Check if the new name already exists (case-insensitive)
            new_name = record_update_data['name']
            existing_supplier = Supplier.query.filter(
                Supplier.name.ilike(new_name),
                Supplier.supplier_id != record_to_update.supplier_id
            ).first()

            if existing_supplier:
                return jsonify({'error': f'Supplier name "{new_name}" already exists (case-insensitive).'}), 400

            # Update the record
            record_to_update.name = new_name
            updated_ids.append(record_to_update.supplier_id)

        try:
            db.session.commit()
        except IntegrityError as e:
            db.session.rollback()
            return jsonify({'error': f'Database error: {str(e)}'}), 500

        # Re-query updated records
        updated_records = Supplier.query.filter(Supplier.supplier_id.in_(updated_ids)).all()

        return jsonify({'message': 'Selected suppliers updated successfully!', 'updated_records': [record.to_dict() for record in updated_records]})

# Delete one or multiple records
@app.route('/suppliers/delete', methods=['DELETE'])
def delete_suppliers():
    selected_records = request.json.get('selected_records', [])

    if not selected_records:
        return jsonify({'error': 'No records selected for deletion.'}), 400

    # Initialize response containers
    success_deletes = []
    failed_deletes = []

    for selected_record in selected_records:
        supplier_name = selected_record.get('name', '').strip()

        # Query the matching supplier
        supplier_to_delete = Supplier.query.filter(Supplier.name.ilike(supplier_name)).first()

        if not supplier_to_delete:
            failed_deletes.append({
                'name': supplier_name,
                'error': 'Supplier not found in Suppliers table.'
            })
            continue

        # Check for dependencies in PurchaseOrders table
        purchase_order_dependencies = PurchaseOrder.query.filter_by(supplier_id=supplier_to_delete.supplier_id).all()

        if purchase_order_dependencies:
            failed_deletes.append({
                'name': supplier_name,
                'error': 'Supplier is referenced in the PurchaseOrders table and cannot be deleted.',
                'dependent_records': [record.to_dict() for record in purchase_order_dependencies]
            })
            continue

        # Check for dependencies in Returns table
        return_dependencies = Return.query.filter_by(supplier_id=supplier_to_delete.supplier_id).all()

        if return_dependencies:
            failed_deletes.append({
                'name': supplier_name,
                'error': 'Supplier is referenced in the Returns table and cannot be deleted.',
                'dependent_records': [record.to_dict() for record in return_dependencies]
            })
            continue

        # Delete the supplier if no dependencies exist
        db.session.delete(supplier_to_delete)
        success_deletes.append({
            'name': supplier_name,
            'message': 'Supplier deleted successfully.'
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


# ---------------------------------------------------------------------------------------------------------------
# Purchase Orders CRUD Operations                                                                                |
# ---------------------------------------------------------------------------------------------------------------
# Create one or multiple records
@app.route('/purchase_orders', methods=['POST'])
def create_purchase_order():
    data = request.json
    required_fields = ['purchase_order_id', 'supplier_name', 'order_date', 'product', 'purchase_quantity', 'purchase_unit_price', 'purchase_currency', 'target_currency', 'fx_rate']
    if isinstance(data, list):
        purchase_orders = []
        for record in data:
            for field in required_fields:
                if field not in record or not record[field]:
                    return jsonify({'error': f'{field} is required for all records'}), 400

            supplier = Supplier.query.filter(Supplier.name.ilike(record['supplier_name'])).first()
            if not supplier:
                return jsonify({'error': f'Supplier with name "{record["supplier_name"]}" not found'}), 404
            
            # Covert purchase_order_id, product, purchase_currency, target_currency to uppercase
            record['purchase_order_id'] = record['purchase_order_id'].upper()
            record['product'] = record['product'].upper()
            record['purchase_currency'] = record['purchase_currency'].upper()
            record['target_currency'] = record['target_currency'].upper()
            
            # Convert order_date to datetime.date
            try:
                order_date = datetime.strptime(record['order_date'], "%Y-%m-%d").date()
            except ValueError:
                return jsonify({'error': 'Invalid date format for order_date. Use YYYY-MM-DD.'}), 400
            
            new_purchase_order = PurchaseOrder(
                purchase_order_id=record['purchase_order_id'],
                product=record['product'],
                supplier_id=supplier.supplier_id,
                order_date=order_date,
                purchase_quantity=record['purchase_quantity'],
                purchase_unit_price=record['purchase_unit_price'],
                purchase_currency=record['purchase_currency'],
                target_currency=record['target_currency'],
                fx_rate=record['fx_rate']
            )
            db.session.add(new_purchase_order)
            purchase_orders.append(new_purchase_order.to_dict())
        try:
            db.session.commit()
        except IntegrityError as e:
            db.session.rollback()
            if "FOREIGN KEY constraint" in str(e.orig):
                return jsonify({'error': 'Foreign key constraint failed: No supplier referenced record exist in Suppliers dataset.'}), 400
            elif "UNIQUE constraint" in str(e.orig):
                return jsonify({'error': 'Primary key constraint faild: Duplicate combination of purchase order ID and product detected.'}), 400
            else:
                return jsonify({'error': f'Database error: {str(e)}'}), 500
        return jsonify({'message': 'Purchase orders created successfully!', 'purchase_orders': purchase_orders}), 201
    else:
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'error': f'{field} is required'}), 400

        supplier = Supplier.query.filter(Supplier.name.ilike(data['supplier_name'])).first()
        if not supplier:
            return jsonify({'error': f'Supplier with name "{data["supplier_name"]}" not found'}), 404
        
        # Covert purchase_order_id, product, purchase_currency, target_currency to uppercase
        data['purchase_order_id'] = data['purchase_order_id'].upper()
        data['product'] = data['product'].upper()
        data['purchase_currency'] = data['purchase_currency'].upper()
        data['target_currency'] = data['target_currency'].upper()

        # Convert order_date to datetime.date
        try:
            order_date = datetime.strptime(data['order_date'], "%Y-%m-%d").date()
        except ValueError:
            return jsonify({'error': 'Invalid date format for order_date. Use YYYY-MM-DD.'}), 400

        new_purchase_order = PurchaseOrder(
            purchase_order_id=data['purchase_order_id'],
            product=data['product'],
            supplier_id=supplier.supplier_id,
            order_date=order_date,
            purchase_quantity=data['purchase_quantity'],
            purchase_unit_price=data['purchase_unit_price'],
            purchase_currency=data['purchase_currency'],
            target_currency=data['target_currency'],
            fx_rate=data['fx_rate']
        )
        db.session.add(new_purchase_order)
        try:
            db.session.commit()
        except IntegrityError as e:
            db.session.rollback()
            if "FOREIGN KEY constraint" in str(e.orig):
                return jsonify({'error': 'Foreign key constraint failed: No supplier referenced record exist in Suppliers dataset.'}), 400
            elif "UNIQUE constraint" in str(e.orig):
                return jsonify({'error': 'Primary key constraint faild: Duplicate combination of purchase order ID and product detected.'}), 400
            else:
                return jsonify({'error': f'Database error: {str(e)}'}), 500
        return jsonify({'message': 'Purchase order created successfully!', 'purchase_order': new_purchase_order.to_dict()}), 201

# Bulk upload endpoint for purchase orders - optimized for large datasets
@app.route('/purchase_orders/bulk', methods=['POST'])
def bulk_create_purchase_orders():
    data = request.json
    required_fields = ['purchase_order_id', 'supplier_name', 'order_date', 'product', 'purchase_quantity', 'purchase_unit_price', 'purchase_currency', 'target_currency', 'fx_rate']
    
    if not isinstance(data, dict) or 'records' not in data:
        return jsonify({'error': 'Request must contain a "records" array'}), 400
    
    records = data['records']
    if not isinstance(records, list):
        return jsonify({'error': 'Records must be an array'}), 400
    
    if len(records) == 0:
        return jsonify({'message': 'No records to process'}), 200
    
    try:
        # Pre-fetch all suppliers to avoid N+1 queries
        supplier_names = set(record['supplier_name'] for record in records)
        suppliers = {
            supplier.name.lower(): supplier.supplier_id 
            for supplier in Supplier.query.filter(
                Supplier.name.in_(supplier_names)
            ).all()
        }
        
        # Validate all records first
        validated_records = []
        for i, record in enumerate(records):
            for field in required_fields:
                if field not in record or not record[field]:
                    return jsonify({'error': f'{field} is required for record at index {i}'}), 400
            
            # Check if supplier exists
            supplier_name_lower = record['supplier_name'].lower()
            if supplier_name_lower not in suppliers:
                return jsonify({'error': f'Supplier with name "{record["supplier_name"]}" not found at record {i}'}), 404
            
            # Convert order_date to datetime.date
            try:
                order_date = datetime.strptime(record['order_date'], "%Y-%m-%d").date()
            except ValueError:
                return jsonify({'error': f'Invalid date format for order_date at record {i}. Use YYYY-MM-DD.'}), 400
            
            validated_records.append({
                'purchase_order_id': record['purchase_order_id'].upper(),
                'product': record['product'].upper(),
                'supplier_id': suppliers[supplier_name_lower],
                'order_date': order_date,
                'purchase_quantity': record['purchase_quantity'],
                'purchase_unit_price': record['purchase_unit_price'],
                'purchase_currency': record['purchase_currency'].upper(),
                'target_currency': record['target_currency'].upper(),
                'fx_rate': record['fx_rate'],
                'quantity_left': record['purchase_quantity']  # Initialize quantity_left to purchase_quantity
            })
        
        # Bulk insert using SQLAlchemy core for better performance
        db.session.execute(
            PurchaseOrder.__table__.insert(),
            validated_records
        )
        db.session.commit()
        
        return jsonify({
            'message': f'Successfully created {len(validated_records)} purchase orders!',
            'processed_count': len(validated_records)
        }), 201
        
    except IntegrityError as e:
        db.session.rollback()
        if "FOREIGN KEY constraint" in str(e.orig):
            return jsonify({'error': 'Foreign key constraint failed: Invalid supplier reference detected in the batch.'}), 400
        elif "UNIQUE constraint" in str(e.orig):
            return jsonify({'error': 'Primary key constraint failed: Duplicate combination of Purchase Order ID and Product detected in the batch.'}), 400
        else:
            return jsonify({'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500

# Read all
@app.route('/purchase_orders', methods=['GET'])
def get_purchase_orders():
    purchase_orders = PurchaseOrder.query.all()
    return jsonify([purchase_order.to_dict() for purchase_order in purchase_orders])

# Read Partial - Ambiguous Filters
@app.route('/purchase_orders/filter', methods=['GET'])
def get_purchase_orders_by_filter():
    query = PurchaseOrder.query

    conditions = []

    if 'purchase_order_id' in request.args:
        order_id_filter = request.args.get('purchase_order_id')
        conditions.append(PurchaseOrder.purchase_order_id.ilike(f"%{order_id_filter}%"))  # Case-insensitive and partial match

    if 'product' in request.args:
        product_filter = request.args.get('product')
        conditions.append(PurchaseOrder.product.ilike(f"%{product_filter}%"))  # Case-insensitive and partial match

    if conditions:
        query = query.filter(and_(*conditions))

    purchase_orders = query.all()

    if not purchase_orders:
        return jsonify({'error': 'No purchase orders found with the given filters'}), 404

    return jsonify([purchase_order.to_dict() for purchase_order in purchase_orders])

# Update one or multiple records
@app.route('/purchase_orders/update', methods=['PUT'])
def update_purchase_orders():
    selected_records = request.json.get('selected_records', [])
    update_data = request.json.get('update_data', {})

    if not selected_records:
        return jsonify({'error': 'No records selected for update.'}), 400

    if not isinstance(update_data, list) or len(update_data) != len(selected_records):
        return jsonify({'error': 'The update_data must be a list and match the number of selected_records.'}), 400

    # Use session.no_autoflush to prevent autoflush while querying
    with db.session.no_autoflush:
        # Build the query for selected records
        query_conditions = [
            (PurchaseOrder.purchase_order_id == record['purchase_order_id'].upper()) &
            (PurchaseOrder.product == record['product'].upper())
            for record in selected_records
        ]
        query = PurchaseOrder.query.filter(or_(*query_conditions))

        matching_records = query.all()

        if not matching_records:
            return jsonify({'error': 'No selected records found for update.'}), 404
        
        if len(matching_records) != len(selected_records):
            # Identify the missing records
            found_records = {(record.purchase_order_id, record.product) for record in matching_records}
            missing_records = [
                record for record in selected_records
                if (record['purchase_order_id'].upper(), record['product'].upper()) not in found_records
            ]
            return jsonify({
                'error': 'Some selected records were not found for update.',
                'missing_records': missing_records
            }), 404
        
        updated_identifiers = []

        for record_to_update, record_update_data in zip(matching_records, update_data):
            # Validate required fields
            required_fields = ['purchase_order_id', 'supplier_name', 'order_date', 'product', 'purchase_quantity', 'purchase_unit_price', 'purchase_currency', 'target_currency', 'fx_rate']
            for field in required_fields:
                if field not in record_update_data or not record_update_data[field]:
                    return jsonify({'error': f'{field} is required for all records'}), 400

            # Handle supplier_name lookup
            if 'supplier_name' in record_update_data:
                supplier = Supplier.query.filter(Supplier.name.ilike(record_update_data['supplier_name'])).first()
                if not supplier:
                    return jsonify({'error': f'Supplier with name "{record_update_data["supplier_name"]}" not found'}), 404
                record_to_update.supplier_id = supplier.supplier_id

            # Convert string fields to uppercase
            if 'purchase_order_id' in record_update_data:
                record_update_data['purchase_order_id'] = record_update_data['purchase_order_id'].upper()
            if 'product' in record_update_data:
                record_update_data['product'] = record_update_data['product'].upper()
            if 'purchase_currency' in record_update_data:
                record_update_data['purchase_currency'] = record_update_data['purchase_currency'].upper()
            if 'target_currency' in record_update_data:
                record_update_data['target_currency'] = record_update_data['target_currency'].upper()

            # Validate and convert order_date
            if 'order_date' in record_update_data:
                try:
                    record_update_data['order_date'] = datetime.strptime(record_update_data['order_date'], "%Y-%m-%d").date()
                except ValueError:
                    return jsonify({'error': 'Invalid date format for order_date. Use YYYY-MM-DD.'}), 400

            # Check if new identifiers already exist
            new_purchase_order_id = record_update_data.get('purchase_order_id', record_to_update.purchase_order_id)
            new_product = record_update_data.get('product', record_to_update.product)

            if new_purchase_order_id != record_to_update.purchase_order_id or new_product != record_to_update.product:
                existing_record = PurchaseOrder.query.filter_by(
                    purchase_order_id=new_purchase_order_id,
                    product=new_product
                ).first()

                if existing_record and existing_record != record_to_update:
                    return jsonify({'error': f'Record with purchase_order_id "{new_purchase_order_id}" and product "{new_product}" already exists.'}), 400

            # Create a new record with updated identifiers
            if new_purchase_order_id != record_to_update.purchase_order_id or new_product != record_to_update.product:
                new_record = PurchaseOrder(
                    purchase_order_id=new_purchase_order_id,
                    product=new_product,
                    supplier_id=record_to_update.supplier_id,
                    order_date=record_update_data['order_date'],
                    purchase_quantity=record_update_data['purchase_quantity'],
                    purchase_unit_price=record_update_data['purchase_unit_price'],
                    purchase_currency=record_update_data['purchase_currency'],
                    target_currency=record_update_data['target_currency'],
                    fx_rate=record_update_data['fx_rate'],
                    quantity_left=0
                )
                db.session.add(new_record)
                db.session.delete(record_to_update)
            else:
                for field, value in record_update_data.items():
                    if hasattr(record_to_update, field):
                        setattr(record_to_update, field, value)
            
            updated_identifiers.append((new_purchase_order_id, new_product))

        try:
            db.session.commit()
        except IntegrityError as e:
            db.session.rollback()
            if "FOREIGN KEY constraint" in str(e.orig):
                return jsonify({'error': 'Foreign key constraint failed: No supplier referenced record exist in Suppliers dataset.'}), 400
            elif "UNIQUE constraint" in str(e.orig):
                return jsonify({'error': 'Primary key constraint faild: Duplicate combination of purchase order ID and product detected.'}), 400
            else:
                return jsonify({'error': f'Database error: {str(e)}'}), 500

        # Re-query updated records to ensure they are attached to the session
        updated_records = PurchaseOrder.query.filter(
            or_(
                *[
                    (PurchaseOrder.purchase_order_id == purchase_order_id) &
                    (PurchaseOrder.product == product)
                    for purchase_order_id, product in updated_identifiers
                ]
            )
        ).all()

        return jsonify({'message': 'Selected purchase orders updated successfully!', 'updated_records': [record.to_dict() for record in updated_records]})

# Delete one or multiple records
@app.route('/purchase_orders/delete', methods=['DELETE'])
def delete_purchase_orders():
    selected_records = request.json.get('selected_records', [])

    if not selected_records:
        return jsonify({'error': 'No records selected for deletion.'}), 400

    # Initialize response containers
    success_deletes = []
    failed_deletes = []

    for selected_record in selected_records:
        purchase_order_id = selected_record.get('purchase_order_id', '').upper()
        product = selected_record.get('product', '').upper()

        # Query the matching record
        record_to_delete = PurchaseOrder.query.filter_by(
            purchase_order_id=purchase_order_id,
            product=product
        ).first()

        if not record_to_delete:
            failed_deletes.append({
                'purchase_order_id': purchase_order_id,
                'product': product,
                'error': 'Record not found in Purchase Orders.'
            })
            continue

        # Check for references in the ManufactureResult table
        linked_records = ManufactureResult.query.filter_by(
            fulfilled_by_po=purchase_order_id,
            product=product
        ).all()

        if linked_records:
            failed_deletes.append({
                'purchase_order_id': purchase_order_id,
                'product': product,
                'error': 'Record is referenced in the ManufactureResult table and cannot be deleted.',
                'dependent_records': [record.to_dict() for record in linked_records]
            })
            continue

        # Delete the record if no references exist
        db.session.delete(record_to_delete)
        success_deletes.append({
            'purchase_order_id': purchase_order_id,
            'product': product,
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

# Delete all purchase orders - optimized for large datasets
@app.route('/purchase_orders/delete_all', methods=['DELETE'])
def delete_all_purchase_orders():
    try:
        # Check for any ManufactureResult references first
        manufacture_count = db.session.query(ManufactureResult).count()
        if manufacture_count > 0:
            return jsonify({'error': 'Cannot delete all purchase orders: Records are referenced in the ManufactureResult table. Delete ManufactureResult records first.'}), 400
        
        # Delete all records
        num_deleted = db.session.query(PurchaseOrder).delete()
        db.session.commit()

        return jsonify({
            'message': f'All records in the PurchaseOrders table have been deleted.',
            'num_deleted': num_deleted
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error occurred during deletion: {str(e)}'}), 500

# Bulk delete specific purchase orders - optimized for large datasets
@app.route('/purchase_orders/bulk_delete', methods=['DELETE'])
def bulk_delete_purchase_orders():
    data = request.json
    
    if not isinstance(data, dict) or 'selected_records' not in data:
        return jsonify({'error': 'Request must contain a "selected_records" array'}), 400
    
    selected_records = data['selected_records']
    if not isinstance(selected_records, list):
        return jsonify({'error': 'selected_records must be an array'}), 400
    
    if len(selected_records) == 0:
        return jsonify({'message': 'No records to delete'}), 200
    
    try:
        # Extract purchase_order_ids and products for bulk operations
        record_identifiers = []
        for record in selected_records:
            if 'purchase_order_id' not in record or 'product' not in record:
                return jsonify({'error': 'Each record must contain purchase_order_id and product'}), 400
            record_identifiers.append((record['purchase_order_id'], record['product']))
        
        # Get the records that will be deleted to check for references
        records_to_delete = []
        for purchase_order_id, product in record_identifiers:
            record = db.session.query(PurchaseOrder).filter_by(
                purchase_order_id=purchase_order_id,
                product=product
            ).first()
            if record:
                records_to_delete.append(record)
        
        # Check for ManufactureResult references
        error_messages = []
        valid_records = []
        
        for record in records_to_delete:
            has_references = False
            
            # Check for ManufactureResult references
            manufacture_references = db.session.query(ManufactureResult).filter_by(
                fulfilled_by_po=record.purchase_order_id,
                product=record.product
            ).first()
            
            if manufacture_references:
                error_messages.append(f'Purchase order {record.purchase_order_id} (product: {record.product}) is referenced in the ManufactureResult table')
                has_references = True
            
            if not has_references:
                valid_records.append(record)
        
        # If there are any reference errors, return them all
        if error_messages:
            return jsonify({
                'error': f'Cannot delete some records due to foreign key constraints:\n' + '\n'.join(error_messages)
            }), 400
        
        # Delete only the valid records (those without foreign key references)
        num_deleted = 0
        for record in valid_records:
            db.session.delete(record)
            num_deleted += 1
        
        db.session.commit()
        
        return jsonify({
            'message': f'Successfully deleted {num_deleted} purchase orders!',
            'deleted_count': num_deleted
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error occurred during deletion: {str(e)}'}), 500


# ---------------------------------------------------------------------------------------------------------------
# Manufacture Orders CRUD Operations                                                                             |
# ---------------------------------------------------------------------------------------------------------------
# Create one or multiple records
@app.route('/manufacture_orders', methods=['POST'])
def create_manufacture_order():
    data = request.json
    required_fields = ['sku', 'product', 'manufacture_quantity', 'manufacture_date']

    if isinstance(data, list):
        manufacture_orders = []
        for record in data:
            for field in required_fields:
                if field not in record or not record[field]:
                    return jsonify({'error': f'{field} is required for all records'}), 400

            # Convert sku and product to uppercase
            record['sku'] = record['sku'].upper()
            record['product'] = record['product'].upper()

            # Convert manufacture_date to datetime.date
            try:
                manufacture_date = datetime.strptime(record['manufacture_date'], "%Y-%m-%d").date()
            except ValueError:
                return jsonify({'error': 'Invalid date format for manufacture_date. Use YYYY-MM-DD.'}), 400

            new_manufacture_order = ManufactureOrder(
                sku=record['sku'],
                product=record['product'],
                manufacture_quantity=record['manufacture_quantity'],
                manufacture_date=manufacture_date
            )
            db.session.add(new_manufacture_order)
            manufacture_orders.append(new_manufacture_order.to_dict())
        try:
            db.session.commit()
        except IntegrityError as e:
            db.session.rollback()
            if "UNIQUE constraint" in str(e.orig):
                return jsonify({'error': 'Primary key constraint faild: Duplicate combination of sku, manufacture date, and product detected.'}), 400
            else:
                return jsonify({'error': f'Database error: {str(e)}'}), 500
        return jsonify({'message': 'Manufacture orders created successfully!', 'manufacture_orders': manufacture_orders}), 201
    else:
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'error': f'{field} is required'}), 400

        # Convert sku and product to uppercase
        data['sku'] = data['sku'].upper()
        data['product'] = data['product'].upper()

        new_manufacture_order = ManufactureOrder(
            sku=data['sku'],
            product=data['product'],
            manufacture_quantity=data['manufacture_quantity'],
            manufacture_date=data['manufacture_date']
        )
        db.session.add(new_manufacture_order)
        try:
            db.session.commit()
        except IntegrityError as e:
            db.session.rollback()
            if "UNIQUE constraint" in str(e.orig):
                return jsonify({'error': 'Primary key constraint faild: Duplicate combination of sku, manufacture date, and product detected.'}), 400
            else:
                return jsonify({'error': f'Database error: {str(e)}'}), 500

        return jsonify({'message': 'Manufacture order created successfully!', 'manufacture_order': new_manufacture_order.to_dict()}), 201

# Bulk upload endpoint for manufacture orders - optimized for large datasets
@app.route('/manufacture_orders/bulk', methods=['POST'])
def bulk_create_manufacture_orders():
    data = request.json
    required_fields = ['sku', 'product', 'manufacture_quantity', 'manufacture_date']
    
    if not isinstance(data, dict) or 'records' not in data:
        return jsonify({'error': 'Request must contain a "records" array'}), 400
    
    records = data['records']
    if not isinstance(records, list):
        return jsonify({'error': 'Records must be an array'}), 400
    
    if len(records) == 0:
        return jsonify({'message': 'No records to process'}), 200
    
    try:
        # Validate all records first
        validated_records = []
        for i, record in enumerate(records):
            for field in required_fields:
                if field not in record or not record[field]:
                    return jsonify({'error': f'{field} is required for record at index {i}'}), 400
            
            # Convert sku and product to uppercase
            record['sku'] = record['sku'].upper()
            record['product'] = record['product'].upper()
            
            # Convert manufacture_date to datetime.date
            try:
                manufacture_date = datetime.strptime(record['manufacture_date'], "%Y-%m-%d").date()
            except ValueError:
                return jsonify({'error': f'Invalid date format for manufacture_date at record {i}. Use YYYY-MM-DD.'}), 400
            
            validated_records.append({
                'sku': record['sku'],
                'product': record['product'],
                'manufacture_quantity': record['manufacture_quantity'],
                'manufacture_date': manufacture_date
            })
        
        # Bulk insert using SQLAlchemy core for better performance
        db.session.execute(
            ManufactureOrder.__table__.insert(),
            validated_records
        )
        db.session.commit()
        
        return jsonify({
            'message': f'Successfully created {len(validated_records)} manufacture orders!',
            'processed_count': len(validated_records)
        }), 201
        
    except IntegrityError as e:
        db.session.rollback()
        if "UNIQUE constraint" in str(e.orig):
            return jsonify({'error': 'Primary key constraint failed: Duplicate combination of sku, manufacture date, and product detected in the batch.'}), 400
        else:
            return jsonify({'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500

# Read all
@app.route('/manufacture_orders', methods=['GET'])
def get_all_manufacture_orders():
    manufacture_orders = ManufactureOrder.query.all()
    return jsonify([order.to_dict() for order in manufacture_orders])

# Read Partial - Multiple Ambiguous Filters
@app.route('/manufacture_orders/filter', methods=['GET'])
def get_manufacture_orders_by_filter():
    query = ManufactureOrder.query

    # Initialize individual filter conditions
    conditions = []

    # Add sku filter with partial match
    if 'sku' in request.args:
        sku_filter = request.args.get('sku')
        conditions.append(ManufactureOrder.sku.ilike(f"%{sku_filter}%"))  # Partial match (case-insensitive)

    # Add product filter with partial match
    if 'product' in request.args:
        product_filter = request.args.get('product')
        conditions.append(ManufactureOrder.product.ilike(f"%{product_filter}%"))  # Partial match (case-insensitive)

    # Add manufacture_date filter (exact match)
    if 'manufacture_date' in request.args:
        date_filter = request.args.get('manufacture_date')
        conditions.append(ManufactureOrder.manufacture_date == date_filter)

    # Combine conditions using AND logic
    if conditions:
        query = query.filter(and_(*conditions))

    manufacture_orders = query.all()

    if not manufacture_orders:
        return jsonify({'error': 'No manufacture orders found with the given filters'}), 404

    return jsonify([order.to_dict() for order in manufacture_orders])

# Update one or multiple records
@app.route('/manufacture_orders/update', methods=['PUT'])
def update_manufacture_orders():
    selected_records = request.json.get('selected_records', [])
    update_data = request.json.get('update_data', {})

    if not selected_records:
        return jsonify({'error': 'No records selected for update.'}), 400

    if not isinstance(update_data, list) or len(update_data) != len(selected_records):
        return jsonify({'error': 'The update_data must be a list and match the number of selected_records.'}), 400

    # Use session.no_autoflush to prevent autoflush while querying
    with db.session.no_autoflush:
        # Build the query for selected records
        query_conditions = [
            (ManufactureOrder.sku == record['sku'].upper()) &
            (ManufactureOrder.manufacture_date == record['manufacture_date']) &
            (ManufactureOrder.product == record['product'].upper())
            for record in selected_records
        ]
        query = ManufactureOrder.query.filter(or_(*query_conditions))

        matching_records = query.all()

        if not matching_records:
            return jsonify({'error': 'No selected records found for update.'}), 404
        
        if len(matching_records) != len(selected_records):
            # Identify the missing records
            found_records = {
                (record.sku, record.manufacture_date, record.product)
                for record in matching_records
            }
            missing_records = [
                record for record in selected_records
                if (
                    record['sku'].upper(),
                    record['manufacture_date'],
                    record['product'].upper()
                ) not in found_records
            ]
            return jsonify({
                'error': 'Some selected records were not found for update.',
                'missing_records': missing_records
            }), 404

        updated_identifiers = []

        for record_to_update, record_update_data in zip(matching_records, update_data):
            # Validate required fields
            required_fields = ['sku', 'product', 'manufacture_quantity', 'manufacture_date']
            for field in required_fields:
                if field not in record_update_data or not record_update_data[field]:
                    return jsonify({'error': f'{field} is required for all records'}), 400

            # Convert sku and product to uppercase
            if 'sku' in record_update_data:
                record_update_data['sku'] = record_update_data['sku'].upper()
            if 'product' in record_update_data:
                record_update_data['product'] = record_update_data['product'].upper()

            # Validate and convert manufacture_date
            if 'manufacture_date' in record_update_data:
                try:
                    record_update_data['manufacture_date'] = datetime.strptime(
                        record_update_data['manufacture_date'], "%Y-%m-%d"
                    ).date()
                except ValueError:
                    return jsonify({'error': 'Invalid date format for manufacture_date. Use YYYY-MM-DD.'}), 400

            # Check if new identifiers already exist
            new_sku = record_update_data.get('sku', record_to_update.sku)
            new_product = record_update_data.get('product', record_to_update.product)
            new_manufacture_date = record_update_data.get('manufacture_date', record_to_update.manufacture_date)

            if (
                new_sku != record_to_update.sku
                or new_product != record_to_update.product
                or new_manufacture_date != record_to_update.manufacture_date
            ):
                existing_record = ManufactureOrder.query.filter_by(
                    sku=new_sku,
                    product=new_product,
                    manufacture_date=new_manufacture_date
                ).first()

                if existing_record and existing_record != record_to_update:
                    return jsonify({
                        'error': f'Record with sku "{new_sku}", product "{new_product}", and manufacture_date "{new_manufacture_date}" already exists.'
                    }), 400

            # Create a new record with updated identifiers if necessary
            if (
                new_sku != record_to_update.sku
                or new_product != record_to_update.product
                or new_manufacture_date != record_to_update.manufacture_date
            ):
                new_record = ManufactureOrder(
                    sku=new_sku,
                    product=new_product,
                    manufacture_quantity=record_update_data['manufacture_quantity'],
                    manufacture_date=new_manufacture_date,
                    manufacture_order_id=record_to_update.manufacture_order_id
                )
                db.session.add(new_record)
                db.session.delete(record_to_update)
            else:
                for field, value in record_update_data.items():
                    if hasattr(record_to_update, field):
                        setattr(record_to_update, field, value)

            updated_identifiers.append((new_sku, new_product, new_manufacture_date))

        try:
            db.session.commit()
        except IntegrityError as e:
            db.session.rollback()
            if "UNIQUE constraint" in str(e.orig):
                return jsonify({'error': 'Primary key constraint failed: Duplicate combination of sku, manufacture date, and product detected.'}), 400
            else:
                return jsonify({'error': f'Database error: {str(e)}'}), 500

        # Re-query updated records to ensure they are attached to the session
        updated_records = ManufactureOrder.query.filter(
            or_(
                *[
                    (ManufactureOrder.sku == sku) &
                    (ManufactureOrder.product == product) &
                    (ManufactureOrder.manufacture_date == manufacture_date)
                    for sku, product, manufacture_date in updated_identifiers
                ]
            )
        ).all()

        return jsonify({'message': 'Selected manufacture orders updated successfully!','updated_records': [record.to_dict() for record in updated_records]})

# Delete one or multiple records
@app.route('/manufacture_orders/delete', methods=['DELETE'])
def delete_manufacture_orders():
    selected_records = request.json.get('selected_records', [])

    if not selected_records:
        return jsonify({'error': 'No records selected for deletion.'}), 400

    # Initialize response containers
    success_deletes = []
    failed_deletes = []

    for selected_record in selected_records:
        sku = selected_record.get('sku', '').upper()
        manufacture_date = selected_record.get('manufacture_date', '')
        product = selected_record.get('product', '').upper()

        # Query the matching record
        record_to_delete = ManufactureOrder.query.filter_by(
            sku=sku,
            manufacture_date=manufacture_date,
            product=product
        ).first()

        if not record_to_delete:
            failed_deletes.append({
                'sku': sku,
                'manufacture_date': manufacture_date,
                'product': product,
                'error': 'Record not found in ManufactureOrders table.'
            })
            continue

        # Delete the record
        db.session.delete(record_to_delete)
        success_deletes.append({
            'sku': sku,
            'manufacture_date': manufacture_date,
            'product': product,
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

# Delete all manufacture orders - optimized for large datasets
@app.route('/manufacture_orders/delete_all', methods=['DELETE'])
def delete_all_manufacture_orders():
    try:
        # Delete all records
        num_deleted = db.session.query(ManufactureOrder).delete()
        db.session.commit()

        return jsonify({
            'message': f'All records in the ManufactureOrders table have been deleted.',
            'num_deleted': num_deleted
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error occurred during deletion: {str(e)}'}), 500

# Bulk delete specific manufacture orders - optimized for large datasets
@app.route('/manufacture_orders/bulk_delete', methods=['DELETE'])
def bulk_delete_manufacture_orders():
    data = request.json
    
    if not isinstance(data, dict) or 'record_ids' not in data:
        return jsonify({'error': 'Request must contain a "record_ids" array'}), 400
    
    record_ids = data['record_ids']
    if not isinstance(record_ids, list):
        return jsonify({'error': 'record_ids must be an array'}), 400
    
    if len(record_ids) == 0:
        return jsonify({'message': 'No records to delete'}), 200
    
    try:
        # Bulk delete using SQLAlchemy core for better performance
        num_deleted = db.session.query(ManufactureOrder).filter(
            ManufactureOrder.id.in_(record_ids)
        ).delete(synchronize_session=False)
        
        db.session.commit()
        
        return jsonify({
            'message': f'Successfully deleted {num_deleted} manufacture orders!',
            'deleted_count': num_deleted
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error occurred during deletion: {str(e)}'}), 500


# ---------------------------------------------------------------------------------------------------------------
# Sales Records CRUD Operations                                                                                  |
# ---------------------------------------------------------------------------------------------------------------
# Create one or multiple records
@app.route('/sales_records', methods=['POST'])
def create_sales_record():
    data = request.json
    required_fields = ['sales_record_id', 'sales_date', 'sku', 'quantity_sold', 'customer_name']

    if isinstance(data, list):
        sales_records = []
        for record in data:
            for field in required_fields:
                if field not in record or not record[field]:
                    return jsonify({'error': f'{field} is required for all records'}), 400

            customer = Customer.query.filter(Customer.name.ilike(record['customer_name'])).first()
            if not customer:
                return jsonify({'error': f'Customer with name "{record["customer_name"]}" not found'}), 404

            try:
                sales_date = datetime.strptime(record['sales_date'], "%Y-%m-%d").date()
            except ValueError:
                return jsonify({'error': 'Invalid date format for sales_date. Use YYYY-MM-DD.'}), 400

            new_sales_record = SalesRecord(
                sales_record_id=record['sales_record_id'].upper(),
                sales_date=sales_date,
                sku=record['sku'].upper(),
                quantity_sold=record['quantity_sold'],
                customer_id=customer.customer_id
            )
            db.session.add(new_sales_record)
            sales_records.append(new_sales_record.to_dict())
        try:
            db.session.commit()
        except IntegrityError as e:
            db.session.rollback()
            if "FOREIGN KEY constraint" in str(e.orig):
                return jsonify({'error': 'Foreign key constraint failed: No customer referenced record exist in Customers dataset.'}), 400
            elif "UNIQUE constraint" in str(e.orig):
                return jsonify({'error': 'Primary key constraint faild: Duplicate combination of Sales Record ID and SKU detected.'}), 400
            else:
                return jsonify({'error': f'Database error: {str(e)}'}), 500
        return jsonify({'message': 'Sales records created successfully!', 'sales_records': sales_records}), 201
    else:
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'error': f'{field} is required'}), 400

        customer = Customer.query.filter(Customer.name.ilike(data['customer_name'])).first()
        if not customer:
            return jsonify({'error': f'Customer with name "{data["customer_name"]}" not found'}), 404

        new_sales_record = SalesRecord(
            sales_record_id=data['sales_record_id'].upper(),
            sales_date=data['sales_date'],
            sku=data['sku'].upper(),
            quantity_sold=data['quantity_sold'],
            customer_id=customer.customer_id
        )
        db.session.add(new_sales_record)
        try:
            db.session.commit()
        except IntegrityError as e:
            db.session.rollback()
            if "FOREIGN KEY constraint" in str(e.orig):
                return jsonify({'error': 'Foreign key constraint failed: No customer referenced record exist in Customers dataset.'}), 400
            elif "UNIQUE constraint" in str(e.orig):
                return jsonify({'error': 'Primary key constraint faild: Duplicate combination of Sales Record ID and SKU detected.'}), 400
            else:
                return jsonify({'error': f'Database error: {str(e)}'}), 500

        return jsonify({'message': 'Sales record created successfully!', 'sales_record': new_sales_record.to_dict()}), 201

# Bulk upload endpoint for sales records - optimized for large datasets
@app.route('/sales_records/bulk', methods=['POST'])
def bulk_create_sales_records():
    data = request.json
    required_fields = ['sales_record_id', 'sales_date', 'sku', 'quantity_sold', 'customer_name']
    
    if not isinstance(data, dict) or 'records' not in data:
        return jsonify({'error': 'Request must contain a "records" array'}), 400
    
    records = data['records']
    if not isinstance(records, list):
        return jsonify({'error': 'Records must be an array'}), 400
    
    if len(records) == 0:
        return jsonify({'message': 'No records to process'}), 200
    
    try:
        # Pre-fetch all customers to avoid N+1 queries
        customer_names = set(record['customer_name'] for record in records)
        customers = {
            customer.name.lower(): customer.customer_id 
            for customer in Customer.query.filter(
                Customer.name.in_(customer_names)
            ).all()
        }
        
        # Validate all records first
        validated_records = []
        for i, record in enumerate(records):
            for field in required_fields:
                if field not in record or not record[field]:
                    return jsonify({'error': f'{field} is required for record at index {i}'}), 400
            
            # Check if customer exists
            customer_name_lower = record['customer_name'].lower()
            if customer_name_lower not in customers:
                return jsonify({'error': f'Customer with name "{record["customer_name"]}" not found at record {i}'}), 404
            
            # Convert sales_date to datetime.date
            try:
                sales_date = datetime.strptime(record['sales_date'], "%Y-%m-%d").date()
            except ValueError:
                return jsonify({'error': f'Invalid date format for sales_date at record {i}. Use YYYY-MM-DD.'}), 400
            
            validated_records.append({
                'sales_record_id': record['sales_record_id'].upper(),
                'sales_date': sales_date,
                'sku': record['sku'].upper(),
                'quantity_sold': record['quantity_sold'],
                'customer_id': customers[customer_name_lower]
            })
        
        # Bulk insert using SQLAlchemy core for better performance
        db.session.execute(
            SalesRecord.__table__.insert(),
            validated_records
        )
        db.session.commit()
        
        return jsonify({
            'message': f'Successfully created {len(validated_records)} sales records!',
            'processed_count': len(validated_records)
        }), 201
        
    except IntegrityError as e:
        db.session.rollback()
        if "FOREIGN KEY constraint" in str(e.orig):
            return jsonify({'error': 'Foreign key constraint failed: Invalid customer reference detected in the batch.'}), 400
        elif "UNIQUE constraint" in str(e.orig):
            return jsonify({'error': 'Primary key constraint failed: Duplicate combination of Sales Record ID and SKU detected in the batch.'}), 400
        else:
            return jsonify({'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500

# Read all
@app.route('/sales_records', methods=['GET'])
def get_sales_records():
    sales_records = SalesRecord.query.all()
    return jsonify([record.to_dict() for record in sales_records])

# Read Partial - Ambiguous Filters
@app.route('/sales_records/filter', methods=['GET'])
def get_sales_records_by_filter():
    query = SalesRecord.query

    conditions = []

    # Filter by sales_record_id (case-insensitive, partial match)
    if 'sales_record_id' in request.args:
        record_id_filter = request.args.get('sales_record_id')
        conditions.append(SalesRecord.sales_record_id.ilike(f"%{record_id_filter}%"))

    # Filter by sku (case-insensitive, partial match)
    if 'sku' in request.args:
        sku_filter = request.args.get('sku')
        conditions.append(SalesRecord.sku.ilike(f"%{sku_filter}%"))

    # Filter by customer_name
    if 'customer_name' in request.args:
        customer_name_filter = request.args.get('customer_name')
        # Look up customer_id based on customer_name
        customer = Customer.query.filter(Customer.name.ilike(f"%{customer_name_filter}%")).first()
        if customer:
            conditions.append(SalesRecord.customer_id == customer.customer_id)
        else:
            return jsonify({'error': 'No sales records found with the given filters'}), 404

    # Filter by exact sales_date
    if 'sales_date' in request.args:
        exact_date = request.args.get('sales_date')
        conditions.append(SalesRecord.sales_date == exact_date)

    # Filter by sales_date range (between two dates)
    if 'start_date' in request.args and 'end_date' in request.args:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        conditions.append(SalesRecord.sales_date.between(start_date, end_date))

    # Filter by sales_date before a specific date
    if 'before_date' in request.args:
        before_date = request.args.get('before_date')
        conditions.append(SalesRecord.sales_date < before_date)

    # Filter by sales_date after a specific date
    if 'after_date' in request.args:
        after_date = request.args.get('after_date')
        conditions.append(SalesRecord.sales_date > after_date)

    if conditions:
        query = query.filter(and_(*conditions))

    sales_records = query.all()

    if not sales_records:
        return jsonify({'error': 'No sales records found with the given filters'}), 404

    return jsonify([record.to_dict() for record in sales_records])

# Update one or multiple records
@app.route('/sales_records/update', methods=['PUT'])
def update_sales_records():
    selected_records = request.json.get('selected_records', [])
    update_data = request.json.get('update_data', [])

    if not selected_records:
        return jsonify({'error': 'No records selected for update.'}), 400

    if not isinstance(update_data, list) or len(update_data) != len(selected_records):
        return jsonify({'error': 'The update_data must be a list and match the number of selected_records.'}), 400

    # Use session.no_autoflush to prevent autoflush while querying
    with db.session.no_autoflush:
        # Build the query for selected records
        query_conditions = [
            (SalesRecord.sales_record_id == record['sales_record_id'].upper()) &
            (SalesRecord.sku == record['sku'].upper())
            for record in selected_records
        ]
        query = SalesRecord.query.filter(or_(*query_conditions))

        matching_records = query.all()

        if not matching_records:
            return jsonify({'error': 'No selected records found for update.'}), 404
        
        if len(matching_records) != len(selected_records):
            # Identify the missing records
            found_records = {(record.sales_record_id, record.sku) for record in matching_records}
            missing_records = [
                record for record in selected_records
                if (record['sales_record_id'].upper(), record['sku'].upper()) not in found_records
            ]
            return jsonify({
                'error': 'Some selected records were not found for update.',
                'missing_records': missing_records
            }), 404

        updated_identifiers = []

        for record_to_update, record_update_data in zip(matching_records, update_data):
            # Validate required fields
            required_fields = ['sales_record_id', 'sales_date', 'sku', 'quantity_sold', 'customer_name']
            for field in required_fields:
                if field not in record_update_data or not record_update_data[field]:
                    return jsonify({'error': f'{field} is required for all records'}), 400

            # Handle customer_name lookup
            if 'customer_name' in record_update_data:
                customer = Customer.query.filter(Customer.name.ilike(record_update_data['customer_name'])).first()
                if not customer:
                    return jsonify({'error': f'Customer with name "{record_update_data["customer_name"]}" not found'}), 404
                record_to_update.customer_id = customer.customer_id

            # Convert string fields to uppercase
            if 'sales_record_id' in record_update_data:
                record_update_data['sales_record_id'] = record_update_data['sales_record_id'].upper()
            if 'sku' in record_update_data:
                record_update_data['sku'] = record_update_data['sku'].upper()

            # Validate and convert sales_date
            if 'sales_date' in record_update_data:
                try:
                    record_update_data['sales_date'] = datetime.strptime(record_update_data['sales_date'], "%Y-%m-%d").date()
                except ValueError:
                    return jsonify({'error': 'Invalid date format for sales_date. Use YYYY-MM-DD.'}), 400

            # Check if new identifiers already exist
            new_sales_record_id = record_update_data.get('sales_record_id', record_to_update.sales_record_id)
            new_sku = record_update_data.get('sku', record_to_update.sku)

            if new_sales_record_id != record_to_update.sales_record_id or new_sku != record_to_update.sku:
                existing_record = SalesRecord.query.filter_by(
                    sales_record_id=new_sales_record_id,
                    sku=new_sku
                ).first()

                if existing_record and existing_record != record_to_update:
                    return jsonify({'error': f'Record with sales_record_id "{new_sales_record_id}" and sku "{new_sku}" already exists.'}), 400

            # Create a new record with updated identifiers if primary keys change
            if new_sales_record_id != record_to_update.sales_record_id or new_sku != record_to_update.sku:
                new_record = SalesRecord(
                    sales_record_id=new_sales_record_id,
                    sales_date=record_update_data['sales_date'],
                    sku=new_sku,
                    quantity_sold=record_update_data['quantity_sold'],
                    customer_id=record_to_update.customer_id
                )
                db.session.add(new_record)
                db.session.delete(record_to_update)
            else:
                # Update the existing record
                for field, value in record_update_data.items():
                    # Map frontend field names to database field names  
                    if field == 'sku':
                        if hasattr(record_to_update, 'sku'):
                            setattr(record_to_update, 'sku', value)
                    elif hasattr(record_to_update, field):
                        setattr(record_to_update, field, value)

            updated_identifiers.append((new_sales_record_id, new_sku))

        try:
            db.session.commit()
        except IntegrityError as e:
            db.session.rollback()
            if "FOREIGN KEY constraint" in str(e.orig):
                return jsonify({'error': 'Foreign key constraint failed: No customer referenced record exists in Customers dataset.'}), 400
            elif "UNIQUE constraint" in str(e.orig):
                return jsonify({'error': 'Primary key constraint failed: Duplicate combination of Sales Record ID and SKU detected.'}), 400
            else:
                return jsonify({'error': f'Database error: {str(e)}'}), 500

        # Re-query updated records to ensure they are attached to the session
        updated_records = SalesRecord.query.filter(
            or_(
                *[
                    (SalesRecord.sales_record_id == sales_record_id) &
                    (SalesRecord.sku == SKU)
                    for sales_record_id, SKU in updated_identifiers
                ]
            )
        ).all()

        return jsonify({'message': 'Selected sales records updated successfully!', 'updated_records': [record.to_dict() for record in updated_records]})

# Delete one or multiple records
@app.route('/sales_records/delete', methods=['DELETE'])
def delete_sales_records():
    selected_records = request.json.get('selected_records', [])

    if not selected_records:
        return jsonify({'error': 'No records selected for deletion.'}), 400

    # Initialize response containers
    success_deletes = []
    failed_deletes = []

    for selected_record in selected_records:
        sales_record_id = selected_record.get('sales_record_id', '').upper()
        sku = selected_record.get('sku', '').upper()

        # Query the matching record
        record_to_delete = SalesRecord.query.filter_by(
            sales_record_id=sales_record_id,
            sku=sku
        ).first()

        if not record_to_delete:
            failed_deletes.append({
                'sales_record_id': sales_record_id,
                'sku': sku,
                'error': 'Record not found in SalesRecords table.'
            })
            continue

        # Check for references in COGS table
        cogs_references = COGS.query.filter_by(
            sales_record_id=sales_record_id,
            sku=sku
        ).all()

        if cogs_references:
            failed_deletes.append({
                'sales_record_id': sales_record_id,
                'sku': sku,
                'error': 'Record is referenced in the COGS table and cannot be deleted.',
                'dependent_records': [record.to_dict() for record in cogs_references]
            })
            continue

        # Check for references in Returns table
        return_references = Return.query.filter_by(
            return_order_id=sales_record_id,
            sku=sku
        ).all()

        if return_references:
            failed_deletes.append({
                'sales_record_id': sales_record_id,
                'sku': sku,
                'error': 'Record is referenced in the Returns table and cannot be deleted.',
                'dependent_records': [record.to_dict() for record in return_references]
            })
            continue

        # Delete the record if no references exist
        db.session.delete(record_to_delete)
        success_deletes.append({
            'sales_record_id': sales_record_id,
            'sku': sku,
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

# Delete all sales records - optimized for large datasets
@app.route('/sales_records/delete_all', methods=['DELETE'])
def delete_all_sales_records():
    try:
        # Check for any COGS references first
        cogs_count = db.session.query(COGS).count()
        if cogs_count > 0:
            return jsonify({'error': 'Cannot delete all sales records: Records are referenced in the COGS table. Delete COGS records first.'}), 400
        
        # Check for any Returns references first
        returns_count = db.session.query(Return).count()
        if returns_count > 0:
            return jsonify({'error': 'Cannot delete all sales records: Records are referenced in the Returns table. Delete Returns records first.'}), 400
        
        # Delete all records
        num_deleted = db.session.query(SalesRecord).delete()
        db.session.commit()

        return jsonify({
            'message': f'All records in the SalesRecords table have been deleted.',
            'num_deleted': num_deleted
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error occurred during deletion: {str(e)}'}), 500

# Bulk delete specific sales records - optimized for large datasets
@app.route('/sales_records/bulk_delete', methods=['DELETE'])
def bulk_delete_sales_records():
    data = request.json
    
    if not isinstance(data, dict) or 'selected_records' not in data:
        return jsonify({'error': 'Request must contain a "selected_records" array'}), 400
    
    selected_records = data['selected_records']
    if not isinstance(selected_records, list):
        return jsonify({'error': 'selected_records must be an array'}), 400
    
    if len(selected_records) == 0:
        return jsonify({'message': 'No records to delete'}), 200
    
    try:
        # Extract sales_record_ids and SKUs for bulk operations
        record_identifiers = []
        for record in selected_records:
            if 'sales_record_id' not in record or 'sku' not in record:
                return jsonify({'error': 'Each record must contain sales_record_id and sku'}), 400
            record_identifiers.append((record['sales_record_id'], record['sku']))
        
        # Get the records that will be deleted to check for references
        records_to_delete = []
        for sales_record_id, sku in record_identifiers:
            record = db.session.query(SalesRecord).filter_by(
                sales_record_id=sales_record_id,
                sku=sku
            ).first()
            if record:
                records_to_delete.append(record)
        
        # Check for COGS and Returns references
        error_messages = []
        valid_records = []
        
        for record in records_to_delete:
            has_references = False
            
            # Check for COGS references
            cogs_references = db.session.query(COGS).filter_by(
                sales_record_id=record.sales_record_id,
                sku=record.sku
            ).first()
            
            if cogs_references:
                error_messages.append(f'Sales record {record.sales_record_id} (sku: {record.sku}) is referenced in the COGS table')
                has_references = True
                
            # Check for Returns references
            return_references = db.session.query(Return).filter_by(
                return_order_id=record.sales_record_id,
                sku=record.sku
            ).first()
            
            if return_references:
                error_messages.append(f'Sales record {record.sales_record_id} (sku: {record.sku}) is referenced in the Returns table')
                has_references = True
            
            if not has_references:
                valid_records.append(record)
        
        # If there are any reference errors, return them all
        if error_messages:
            return jsonify({
                'error': f'Cannot delete some records due to foreign key constraints:\n' + '\n'.join(error_messages)
            }), 400
        
        # Delete only the valid records (those without foreign key references)
        num_deleted = 0
        for record in valid_records:
            db.session.delete(record)
            num_deleted += 1
        
        db.session.commit()
        
        return jsonify({
            'message': f'Successfully deleted {num_deleted} sales records!',
            'deleted_count': num_deleted
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error occurred during deletion: {str(e)}'}), 500


# ---------------------------------------------------------------------------------------------------------------
# Returns CRUD Operations                                                                                        |
# ---------------------------------------------------------------------------------------------------------------
# Create one or multiple records
@app.route('/returns', methods=['POST'])
def create_return():
    data = request.json
    required_fields = ['return_order_id', 'SKU', 'return_date', 'return_quantity', 'return_unit_price', 'supplier_name', 'return_currency', 'target_currency', 'fx_rate']

    if isinstance(data, list):
        returns = []
        for record in data:
            for field in required_fields:
                if field not in record or not record[field]:
                    return jsonify({'error': f'{field} is required for all records'}), 400

            supplier = Supplier.query.filter(Supplier.name.ilike(record['supplier_name'])).first()
            if not supplier:
                return jsonify({'error': f'Supplier with name "{record["supplier_name"]}" not found'}), 404
            
            try:
                return_date = datetime.strptime(record['return_date'], "%Y-%m-%d").date()
            except ValueError:
                return jsonify({'error': 'Invalid date format for return_date. Use YYYY-MM-DD.'}), 400

            new_return = Return(
                return_order_id=record['return_order_id'].upper(),
                SKU=record['SKU'].upper(),
                return_date=return_date,
                return_quantity=record['return_quantity'],
                return_unit_price=record['return_unit_price'],
                supplier_id=supplier.supplier_id,
                return_currency=record['return_currency'].upper(),
                target_currency=record['target_currency'].upper(),
                fx_rate=record['fx_rate']
            )
            db.session.add(new_return)
            returns.append(new_return.to_dict())
        try:
            db.session.commit()
        except IntegrityError as e:
            db.session.rollback()
            if "FOREIGN KEY constraint" in str(e.orig):
                return jsonify({'error': 'Foreign key constraint failed: No supplier referenced record exist in Suppliers dataset or combination of return_order_id and SKU can not be found in Sales Records dataset.'}), 400
            elif "UNIQUE constraint" in str(e.orig):
                return jsonify({'error': 'Primary key constraint faild: Duplicate combination of Return Record ID and SKU detected.'}), 400
            else:
                return jsonify({'error': f'Database error: {str(e)}'}), 500
        return jsonify({'message': 'Returns created successfully!', 'returns': returns}), 201
    else:
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'error': f'{field} is required'}), 400

        supplier = Supplier.query.filter(Supplier.name.ilike(data['supplier_name'])).first()
        if not supplier:
            return jsonify({'error': f'Supplier with name "{data["supplier_name"]}" not found'}), 404

        new_return = Return(
            return_order_id=data['return_order_id'].upper(),
            SKU=data['SKU'].upper(),
            return_date=data['return_date'],
            return_quantity=data['return_quantity'],
            return_unit_price=data['return_unit_price'],
            supplier_id=supplier.supplier_id,
            return_currency=data['return_currency'].upper(),
            target_currency=data['target_currency'].upper(),
            fx_rate=data['fx_rate']
        )
        db.session.add(new_return)
        try:
            db.session.commit()
        except IntegrityError as e:
            db.session.rollback()
            if "FOREIGN KEY constraint" in str(e.orig):
                return jsonify({'error': 'Foreign key constraint failed: No supplier referenced record exist in Suppliers dataset or combination of return_order_id and SKU can not be found in Sales Records dataset.'}), 400
            elif "UNIQUE constraint" in str(e.orig):
                return jsonify({'error': 'Primary key constraint faild: Duplicate combination of Return Record ID and SKU detected.'}), 400
            else:
                return jsonify({'error': f'Database error: {str(e)}'}), 500
        return jsonify({'message': 'Return created successfully!', 'return': new_return.to_dict()}), 201

# Read all
@app.route('/returns', methods=['GET'])
def get_returns():
    returns = Return.query.all()
    return jsonify([record.to_dict() for record in returns])

# Read Partial - Ambiguous Filters
@app.route('/returns/filter', methods=['GET'])
def get_returns_by_filter():
    query = Return.query

    conditions = []

    if 'return_order_id' in request.args:
        order_id_filter = request.args.get('return_order_id')
        conditions.append(Return.return_order_id.ilike(f"%{order_id_filter}%"))  # Case-insensitive and partial match

    if 'SKU' in request.args:
        sku_filter = request.args.get('SKU')
        conditions.append(Return.SKU.ilike(f"%{sku_filter}%"))  # Case-insensitive and partial match
    
    if 'supplier_name' in request.args:
        supplier_name_filter = request.args.get('supplier_name')
        # Look up supplier_id based on supplier_name
        supplier = Supplier.query.filter(Supplier.name.ilike(f"%{supplier_name_filter}%")).first()
        if supplier:
            conditions.append(Return.supplier_id == supplier.supplier_id)
        else:
            return jsonify({'error': 'No returns found with the given filters'}), 404
    
    if 'return_date' in request.args:
        exact_date = request.args.get('return_date')
        conditions.append(Return.return_date == exact_date)

    if 'before_date' in request.args:
        before_date = request.args.get('before_date')
        conditions.append(Return.return_date < before_date)

    if 'after_date' in request.args:
        after_date = request.args.get('after_date')
        conditions.append(Return.return_date > after_date)

    if 'start_date' in request.args and 'end_date' in request.args:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        conditions.append(Return.return_date.between(start_date, end_date))

    if conditions:
        query = query.filter(and_(*conditions))

    returns = query.all()

    if not returns:
        return jsonify({'error': 'No returns found with the given filters'}), 404

    return jsonify([record.to_dict() for record in returns])

# Update one or multiple records
@app.route('/returns/update', methods=['PUT'])
def update_returns():
    selected_records = request.json.get('selected_records', [])
    update_data = request.json.get('update_data', [])

    if not selected_records:
        return jsonify({'error': 'No records selected for update.'}), 400

    if not isinstance(update_data, list) or len(update_data) != len(selected_records):
        return jsonify({'error': 'The update_data must be a list and match the number of selected_records.'}), 400

    # Use session.no_autoflush to prevent autoflush while querying
    with db.session.no_autoflush:
        # Build the query for selected records
        query_conditions = [
            (Return.return_order_id == record['return_order_id'].upper()) &
            (Return.SKU == record['SKU'].upper()) &
            (Return.return_date == record['return_date'])
            for record in selected_records
        ]
        query = Return.query.filter(or_(*query_conditions))

        matching_records = query.all()

        if not matching_records:
            return jsonify({'error': 'No selected records found for update.'}), 404
        
        if len(matching_records) != len(selected_records):
            # Identify the missing records
            found_records = {
                (record.return_order_id, record.SKU, record.return_date)
                for record in matching_records
            }
            missing_records = [
                record for record in selected_records
                if (
                    record['return_order_id'].upper(),
                    record['SKU'].upper(),
                    datetime.strptime(record['return_date'], "%Y-%m-%d").date()
                ) not in found_records
            ]
            return jsonify({
                'error': 'Some selected records were not found for update.',
                'missing_records': missing_records
            }), 404

        updated_identifiers = []

        for record_to_update, record_update_data in zip(matching_records, update_data):
            # Validate required fields
            required_fields = ['return_order_id', 'SKU', 'return_date', 'return_quantity', 'return_unit_price', 'supplier_name', 'return_currency', 'target_currency', 'fx_rate']
            for field in required_fields:
                if field not in record_update_data or not record_update_data[field]:
                    return jsonify({'error': f'{field} is required for all records'}), 400

            # Handle supplier_name lookup
            if 'supplier_name' in record_update_data:
                supplier = Supplier.query.filter(Supplier.name.ilike(record_update_data['supplier_name'])).first()
                if not supplier:
                    return jsonify({'error': f'Supplier with name "{record_update_data["supplier_name"]}" not found'}), 404
                record_to_update.supplier_id = supplier.supplier_id

            # Convert string fields to uppercase
            if 'return_order_id' in record_update_data:
                record_update_data['return_order_id'] = record_update_data['return_order_id'].upper()
            if 'SKU' in record_update_data:
                record_update_data['SKU'] = record_update_data['SKU'].upper()
            if 'return_currency' in record_update_data:
                record_update_data['return_currency'] = record_update_data['return_currency'].upper()
            if 'target_currency' in record_update_data:
                record_update_data['target_currency'] = record_update_data['target_currency'].upper()

            # Validate and convert return_date
            if 'return_date' in record_update_data:
                try:
                    record_update_data['return_date'] = datetime.strptime(record_update_data['return_date'], "%Y-%m-%d").date()
                except ValueError:
                    return jsonify({'error': 'Invalid date format for return_date. Use YYYY-MM-DD.'}), 400

            # Check if new identifiers already exist
            new_return_order_id = record_update_data.get('return_order_id', record_to_update.return_order_id)
            new_SKU = record_update_data.get('SKU', record_to_update.SKU)
            new_return_date = record_update_data.get('return_date', record_to_update.return_date)

            if (new_return_order_id != record_to_update.return_order_id or
                new_SKU != record_to_update.SKU or
                new_return_date != record_to_update.return_date):
                existing_record = Return.query.filter_by(
                    return_order_id=new_return_order_id,
                    SKU=new_SKU,
                    return_date=new_return_date
                ).first()

                if existing_record and existing_record != record_to_update:
                    return jsonify({'error': f'Record with return_order_id "{new_return_order_id}" and SKU "{new_SKU}" already exists.'}), 400

            # Create a new record with updated identifiers if primary keys change
            if new_return_order_id != record_to_update.return_order_id or new_SKU != record_to_update.SKU:
                new_record = Return(
                    return_order_id=new_return_order_id,
                    SKU=new_SKU,
                    return_date=new_return_date,
                    return_quantity=record_update_data['return_quantity'],
                    return_unit_price=record_update_data['return_unit_price'],
                    supplier_id=record_to_update.supplier_id,
                    return_currency=record_update_data['return_currency'],
                    target_currency=record_update_data['target_currency'],
                    fx_rate=record_update_data['fx_rate'],
                    quantity_left=0
                )
                db.session.add(new_record)
                db.session.delete(record_to_update)
            else:
                # Update the existing record
                for field, value in record_update_data.items():
                    if hasattr(record_to_update, field):
                        setattr(record_to_update, field, value)

            updated_identifiers.append((new_return_order_id, new_SKU, str(new_return_date)))

        try:
            db.session.commit()
        except IntegrityError as e:
            db.session.rollback()
            if "FOREIGN KEY constraint" in str(e.orig):
                return jsonify({'error': 'Foreign key constraint failed: No supplier or SalesRecord referenced record exists in the dataset.'}), 400
            elif "UNIQUE constraint" in str(e.orig):
                return jsonify({'error': 'Primary key constraint failed: Duplicate combination of Return Order ID and SKU detected.'}), 400
            else:
                return jsonify({'error': f'Database error: {str(e)}'}), 500

        # Re-query updated records to ensure they are attached to the session
        updated_records = Return.query.filter(
            or_(
                *[(
                    (Return.return_order_id == return_order_id) &
                    (Return.SKU == SKU) &
                    (Return.return_date == return_date)
                ) for return_order_id, SKU, return_date in updated_identifiers]
            )
        ).all()

        return jsonify({'message': 'Selected returns updated successfully!', 'updated_records': [record.to_dict() for record in updated_records]})

# Delete one or multiple records
@app.route('/returns/delete', methods=['DELETE'])
def delete_returns():
    selected_records = request.json.get('selected_records', [])

    if not selected_records:
        return jsonify({'error': 'No records selected for deletion.'}), 400

    # Initialize response containers
    success_deletes = []
    failed_deletes = []

    for selected_record in selected_records:
        return_order_id = selected_record.get('return_order_id', '').upper()
        sku = selected_record.get('SKU', '').upper()
        return_date = selected_record.get('return_date', '')

        # Query the matching record
        record_to_delete = Return.query.filter_by(
            return_order_id=return_order_id,
            SKU=sku,
            return_date=return_date
        ).first()

        if not record_to_delete:
            failed_deletes.append({
                'return_order_id': return_order_id,
                'SKU': sku,
                'return_date': return_date,
                'error': 'Record not found in Returns table.'
            })
            continue

        # Delete the record
        db.session.delete(record_to_delete)
        success_deletes.append({
            'return_order_id': return_order_id,
            'SKU': sku,
            'return_date': return_date,
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


# ---------------------------------------------------------------------------------------------------------------
# Manufacture Stock Initiation and Addition CRUD Operations                                                      |
# ---------------------------------------------------------------------------------------------------------------
# Create one or multiple records
@app.route('/stock_initiation_addition', methods=['POST'])
def create_stock_initiation_addition():
    data = request.json
    required_fields = ['SKU', 'fulfilled_quantity', 'cost', 'manufacture_completion_date']

    if isinstance(data, list):
        stock = []
        for record in data:
            for field in required_fields:
                if field not in record or not record[field]:
                    return jsonify({'error': f'{field} is required for all records'}), 400

            # Convert SKU to uppercase
            record['SKU'] = record['SKU'].upper()

            # Convert manufacture_completion_date to datetime.date
            try:
                manufacture_completion_date = datetime.strptime(record['manufacture_completion_date'], "%Y-%m-%d").date()
            except ValueError:
                return jsonify({'error': 'Invalid date format for manufacture_completion_date. Use YYYY-MM-DD.'}), 400

            new_stock = ManufactureStockInitiationAddition(
                SKU=record['SKU'],
                fulfilled_quantity=record['fulfilled_quantity'],
                cost=record['cost'],
                manufacture_completion_date=manufacture_completion_date
            )
            db.session.add(new_stock)
            stock.append(new_stock.to_dict())
        try:
            db.session.commit()
        except IntegrityError as e:
            db.session.rollback()
            return jsonify({'error': f'Database error: {str(e)}'}), 500
        return jsonify({'message': 'Manufacture Stock Initiation and Addition created successfully!', 'stock': stock}), 201
    else:
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'error': f'{field} is required'}), 400

        # Convert SKU to uppercase
        data['SKU'] = data['SKU'].upper()

        # Convert manufacture_completion_date to datetime.date
        manufacture_completion_date = datetime.strptime(data['manufacture_completion_date'], "%Y-%m-%d").date()

        new_stock = ManufactureStockInitiationAddition(
            SKU=data['SKU'],
            fulfilled_quantity=data['fulfilled_quantity'],
            cost=data['cost'],
            manufacture_completion_date=manufacture_completion_date
        )
        db.session.add(new_stock)
        try:
            db.session.commit()
        except IntegrityError as e:
            db.session.rollback()
            return jsonify({'error': f'Database error: {str(e)}'}), 500
        return jsonify({'message': 'Manufacture order created successfully!', 'stock': new_stock.to_dict()}), 201

# Read all
@app.route('/stock_initiation_addition', methods=['GET'])
def get_all_stock_initiation_addition():
    stocks = ManufactureStockInitiationAddition.query.all()
    return jsonify([stock.to_dict() for stock in stocks])

# Read Partial - Multiple Ambiguous Filters
@app.route('/stock_initiation_addition/filter', methods=['GET'])
def get_stock_initiation_addition_by_filter():
    query = ManufactureStockInitiationAddition.query

    # Initialize individual filter conditions
    conditions = []

    # Add SKU filter with partial match
    if 'SKU' in request.args:
        sku_filter = request.args.get('SKU')
        conditions.append(ManufactureStockInitiationAddition.SKU.ilike(f"%{sku_filter}%"))  # Partial match (case-insensitive)

    # Add manufacture_date filter (exact match)
    if 'manufacture_completion_date' in request.args:
        date_filter = request.args.get('manufacture_completion_date')
        conditions.append(ManufactureStockInitiationAddition.manufacture_completion_date == date_filter)

    # Combine conditions using AND logic
    if conditions:
        query = query.filter(and_(*conditions))

    stocks = query.all()

    if not stocks:
        return jsonify({'error': 'No manufacture stock for initiation and addition found with the given filters'}), 404

    return jsonify([stock.to_dict() for stock in stocks])

# Delete one or multiple records
@app.route('/stock_initiation_addition/delete', methods=['DELETE'])
def delete_stock_initiation_addition():
    selected_records = request.json.get('selected_records', [])

    if not selected_records:
        return jsonify({'error': 'No records selected for deletion.'}), 400

    # Initialize response containers
    success_deletes = []
    failed_deletes = []

    for selected_record in selected_records:
        id = selected_record.get('result_id', '')
        sku = selected_record.get('SKU', '').upper()
        fulfilled_quantity = selected_record.get('fulfilled_quantity', '')
        cost = selected_record.get('cost', '')
        manufacture_completion_date = selected_record.get('manufacture_completion_date', '')

        # Query the matching record
        record_to_delete = ManufactureStockInitiationAddition.query.filter_by(
            result_id=id
        ).first()

        if not record_to_delete:
            failed_deletes.append({
                'result_id': id,
                'SKU': sku,
                'fulfilled_quantity': fulfilled_quantity,
                'cost': cost,
                'manufacture_completion_date': manufacture_completion_date,
                'error': 'Record not found in StockInitiationAddition table.'
            })
            continue

        # Delete the record
        db.session.delete(record_to_delete)
        success_deletes.append({
            'result_id': id,
            'SKU': sku,
            'fulfilled_quantity': fulfilled_quantity,
            'cost': cost,
            'manufacture_completion_date': manufacture_completion_date,
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

# Delete all
@app.route('/stock_initiation_addition/delete_all', methods=['DELETE'])
def delete_all_stock_initiation_addition():
    try:
        # Delete all records
        num_deleted = db.session.query(ManufactureStockInitiationAddition).delete()
        db.session.commit()

        return jsonify({
            'message': f'All records in the StockInitiationAddition table have been deleted.',
            'num_deleted': num_deleted
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error occurred during deletion: {str(e)}'}), 500


# ---------------------------------------------------------------------------------------------------------------
# Stock Exchange and Failed Stock Exchange CRUD Operations                                                                               |
# ---------------------------------------------------------------------------------------------------------------
# Create one or multiple records
@app.route('/stock_exchange', methods=['POST'])
def create_stock_exchange():
    data = request.json
    required_fields = ['SKU_original', 'SKU_new', 'quantity', 'exchange_date']

    if isinstance(data, list):
        exchanges = []
        for record in data:
            for field in required_fields:
                if field not in record or not record[field]:
                    return jsonify({'error': f'{field} is required for all records'}), 400

            # Convert SKUs to uppercase
            record['SKU_original'] = record['SKU_original'].upper()
            record['SKU_new'] = record['SKU_new'].upper()

            # Convert exchange_date to datetime.date
            try:
                exchange_date = datetime.strptime(record['exchange_date'], "%Y-%m-%d").date()
            except ValueError:
                return jsonify({'error': 'Invalid date format for exchange_date. Use YYYY-MM-DD.'}), 400

            new_exchange = StockExchange(
                SKU_original=record['SKU_original'],
                SKU_new=record['SKU_new'],
                quantity=record['quantity'],
                exchange_date=exchange_date
            )
            db.session.add(new_exchange)
            exchanges.append(new_exchange.to_dict())
        try:
            db.session.commit()
        except IntegrityError as e:
            db.session.rollback()
            return jsonify({'error': f'Database error: {str(e)}'}), 500
        return jsonify({'message': 'Stock exchanges created successfully!', 'exchanges': exchanges}), 201
    else:
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'error': f'{field} is required'}), 400

        # Convert SKUs to uppercase
        data['SKU_original'] = data['SKU_original'].upper()
        data['SKU_new'] = data['SKU_new'].upper()

        # Convert exchange_date to datetime.date
        exchange_date = datetime.strptime(data['exchange_date'], "%Y-%m-%d").date()

        new_exchange = StockExchange(
            SKU_original=data['SKU_original'],
            SKU_new=data['SKU_new'],
            quantity=data['quantity'],
            exchange_date=exchange_date
        )
        db.session.add(new_exchange)
        try:
            db.session.commit()
        except IntegrityError as e:
            db.session.rollback()
            return jsonify({'error': f'Database error: {str(e)}'}), 500
        return jsonify({'message': 'Stock exchange created successfully!', 'exchange': new_exchange.to_dict()}), 201

# Read all
@app.route('/stock_exchange', methods=['GET'])
def get_all_stock_exchange():
    exchanges = StockExchange.query.all()
    return jsonify([exchange.to_dict() for exchange in exchanges])

# Read Partial - Multiple Ambiguous Filters
@app.route('/stock_exchange/filter', methods=['GET'])
def get_stock_exchange_by_filter():
    query = StockExchange.query

    # Initialize individual filter conditions
    conditions = []

    # Add SKU filters with partial match
    if 'SKU_original' in request.args:
        sku_filter = request.args.get('SKU_original')
        conditions.append(StockExchange.SKU_original.ilike(f"%{sku_filter}%"))

    if 'SKU_new' in request.args:
        sku_filter = request.args.get('SKU_new')
        conditions.append(StockExchange.SKU_new.ilike(f"%{sku_filter}%"))

    # Add exchange_date filter (exact match)
    if 'exchange_date' in request.args:
        date_filter = request.args.get('exchange_date')
        conditions.append(StockExchange.exchange_date == date_filter)

    # Combine conditions using AND logic
    if conditions:
        query = query.filter(and_(*conditions))

    exchanges = query.all()

    if not exchanges:
        return jsonify({'error': 'No stock exchanges found with the given filters'}), 404

    return jsonify([exchange.to_dict() for exchange in exchanges])

# Delete one or multiple records
@app.route('/stock_exchange/delete', methods=['DELETE'])
def delete_stock_exchange():
    selected_records = request.json.get('selected_records', [])

    if not selected_records:
        return jsonify({'error': 'No records selected for deletion.'}), 400

    # Initialize response containers
    success_deletes = []
    failed_deletes = []

    for selected_record in selected_records:
        id = selected_record.get('id', '')
        sku_original = selected_record.get('SKU_original', '').upper()
        sku_new = selected_record.get('SKU_new', '').upper()
        quantity = selected_record.get('quantity', '')
        exchange_date = selected_record.get('exchange_date', '')

        # Query the matching record
        record_to_delete = StockExchange.query.filter_by(
            id=id
        ).first()

        if not record_to_delete:
            failed_deletes.append({
                'id': id,
                'SKU_original': sku_original,
                'SKU_new': sku_new,
                'quantity': quantity,
                'exchange_date': exchange_date,
                'error': 'Record not found in StockExchange table.'
            })
            continue

        # Delete the record
        db.session.delete(record_to_delete)
        success_deletes.append({
            'id': id,
            'SKU_original': sku_original,
            'SKU_new': sku_new,
            'quantity': quantity,
            'exchange_date': exchange_date,
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

# Delete all
@app.route('/stock_exchange/delete_all', methods=['DELETE'])
def delete_all_stock_exchange():
    try:
        # Delete all records
        num_deleted = db.session.query(StockExchange).delete()
        db.session.commit()

        return jsonify({
            'message': f'All records in the StockExchange table have been deleted.',
            'num_deleted': num_deleted
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error occurred during deletion: {str(e)}'}), 500
    
# Read all
@app.route('/failed_stock_exchange', methods=['GET'])
def get_all_failed_stock_exchange():
    exchanges = FailedStockExchange.query.all()
    return jsonify([exchange.to_dict() for exchange in exchanges])

# Read Partial - Multiple Ambiguous Filters
@app.route('/failed_stock_exchange/filter', methods=['GET'])
def get_failed_stock_exchange_by_filter():
    query = FailedStockExchange.query

    # Initialize individual filter conditions
    conditions = []

    # Add SKU filters with partial match
    if 'SKU_original' in request.args:
        sku_filter = request.args.get('SKU_original')
        conditions.append(FailedStockExchange.SKU_original.ilike(f"%{sku_filter}%"))

    if 'SKU_new' in request.args:
        sku_filter = request.args.get('SKU_new')
        conditions.append(FailedStockExchange.SKU_new.ilike(f"%{sku_filter}%"))

    # Add exchange_date filter (exact match)
    if 'exchange_date' in request.args:
        date_filter = request.args.get('exchange_date')
        conditions.append(FailedStockExchange.exchange_date == date_filter)

    # Combine conditions using AND logic
    if conditions:
        query = query.filter(and_(*conditions))

    exchanges = query.all()

    if not exchanges:
        return jsonify({'error': 'No failed stock exchanges found with the given filters'}), 404

    return jsonify([exchange.to_dict() for exchange in exchanges])

# Delete all
@app.route('/failed_stock_exchange/delete_all', methods=['DELETE'])
def delete_all_failed_stock_exchange():
    try:
        # Delete all records
        num_deleted = db.session.query(FailedStockExchange).delete()
        db.session.commit()

        return jsonify({
            'message': f'All records in the FailedStockExchange table have been deleted.',
            'num_deleted': num_deleted
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error occurred during deletion: {str(e)}'}), 500


# ---------------------------------------------------------------------------------------------------------------
# Read-only and Delete-all routes for ManufactureResult                                                          |
# ---------------------------------------------------------------------------------------------------------------
# Read all
@app.route('/manufacture_result', methods=['GET'])
def get_all_manufacture_results():
    results = ManufactureResult.query.all()
    return jsonify([result.to_dict() for result in results])

# Read Partial - Multiple Ambiguous Filters 
@app.route('/manufacture_result/filter', methods=['GET'])
def get_manufacture_results():
    query = ManufactureResult.query

    conditions = []

    if 'manufacture_order_id' in request.args:
        conditions.append(ManufactureResult.manufacture_order_id == request.args.get('manufacture_order_id'))
    if 'SKU' in request.args:
        sku_filter = request.args.get('SKU')
        conditions.append(ManufactureResult.sku.ilike(f"%{sku_filter}%"))  # Case-insensitive partial match
    if 'product' in request.args:
        product_filter = request.args.get('product')
        conditions.append(ManufactureResult.product.ilike(f"%{product_filter}%"))  # Case-insensitive partial match
    if 'fulfilled_by_PO' in request.args:
        fulfilled_by_PO_filter = request.args.get('fulfilled_by_PO')
        conditions.append(ManufactureResult.fulfilled_by_po.ilike(f"%{fulfilled_by_PO_filter}%"))  # Case-insensitive partial match
    if 'manufacture_completion_date' in request.args:
        conditions.append(ManufactureResult.manufacture_completion_date == request.args.get('manufacture_completion_date'))

    if conditions:
        query = query.filter(and_(*conditions))

    manufacture_results = query.all()

    if not manufacture_results:
        return jsonify({'error': 'No manufacture result found with the given filters'}), 404

    return jsonify([result.to_dict() for result in manufacture_results])

# Delete all
@app.route('/manufacture_result/delete_all', methods=['DELETE'])
def delete_all_manufacture_result():
    try:
        # Delete all records
        num_deleted = db.session.query(ManufactureResult).delete()
        db.session.commit()

        return jsonify({
            'message': f'All records in the ManufactureResult table have been deleted.',
            'num_deleted': num_deleted
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error occurred during deletion: {str(e)}'}), 500
    

# ---------------------------------------------------------------------------------------------------------------
# Read-only and Delete-all routes for FailedManufactureResult                                                    |
# ---------------------------------------------------------------------------------------------------------------
# Read all
@app.route('/failed_manufacture_result', methods=['GET'])
def get_all_failed_manufacture_results():
    results = FailedManufactureResult.query.all()
    return jsonify([result.to_dict() for result in results])

# Read Partial - Multiple Ambiguous Filters
@app.route('/failed_manufacture_result/filter', methods=['GET'])
def get_failed_manufacture_results():
    query = FailedManufactureResult.query

    conditions = []

    if 'manufacture_order_id' in request.args:
        conditions.append(FailedManufactureResult.manufacture_order_id == request.args.get('manufacture_order_id'))
    if 'SKU' in request.args:
        sku_filter = request.args.get('SKU')
        conditions.append(FailedManufactureResult.sku.ilike(f"%{sku_filter}%"))  # Case-insensitive partial match
    if 'product' in request.args:
        product_filter = request.args.get('product')
        conditions.append(FailedManufactureResult.product.ilike(f"%{product_filter}%"))  # Case-insensitive partial match
    if 'manufacture_date' in request.args:
        conditions.append(FailedManufactureResult.manufacture_date == request.args.get('manufacture_date'))

    if conditions:
        query = query.filter(and_(*conditions))

    failed_results = query.all()

    if not failed_results:
        return jsonify({'error': 'No failed manufacture result found with the given filters'}), 404

    return jsonify([result.to_dict() for result in failed_results])

# Delete all
@app.route('/failed_manufacture_result/delete_all', methods=['DELETE'])
def delete_all_failed_manufacture_results():
    try:
        # Delete all records
        num_deleted = db.session.query(FailedManufactureResult).delete()
        db.session.commit()

        return jsonify({
            'message': f'All records in the FailedManufactureResult table have been deleted.',
            'num_deleted': num_deleted
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error occurred during deletion: {str(e)}'}), 500
    

# ---------------------------------------------------------------------------------------------------------------
# Read-only and Delete-all routes for COGS                                                                       |
# ---------------------------------------------------------------------------------------------------------------
# Read all
@app.route('/cogs', methods=['GET'])
def get_all_cogs():
    cogs_records = COGS.query.all()
    return jsonify([record.to_dict() for record in cogs_records])

# Read Partial - Multiple Ambiguous Filters 
@app.route('/cogs/filter', methods=['GET'])
def get_cogs():
    query = COGS.query

    conditions = []

    if 'sales_record_id' in request.args:
        conditions.append(COGS.sales_record_id.ilike(f"%{request.args.get('sales_record_id')}%"))  # Case-insensitive partial match
    if 'sales_date' in request.args:
        sales_date = request.args.get('sales_date')
        conditions.append(COGS.sales_date == sales_date)  # Exact match
    if 'start_date' in request.args and 'end_date' in request.args:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        conditions.append(COGS.sales_date.between(start_date, end_date))  # Range filter
    if 'SKU' in request.args:
        conditions.append(COGS.sku.ilike(f"%{request.args.get('SKU')}%"))  # Case-insensitive partial match
    if 'result_id' in request.args:
        conditions.append(COGS.result_id == request.args.get('result_id'))
    if 'fulfilled_by_PO' in request.args:
        conditions.append(COGS.fulfilled_by_po.ilike(f"%{request.args.get('fulfilled_by_PO')}%"))  # Case-insensitive partial match

    if conditions:
        query = query.filter(and_(*conditions))

    cogs_records = query.all()

    if not cogs_records:
        return jsonify({'error': 'No COGS found with the given filters'}), 404

    return jsonify([record.to_dict() for record in cogs_records])

# Delete all
@app.route('/cogs/delete_all', methods=['DELETE'])
def delete_all_cogs():
    try:
        # Delete all records
        num_deleted = db.session.query(COGS).delete()
        db.session.commit()

        return jsonify({
            'message': f'All records in the COGS table have been deleted.',
            'num_deleted': num_deleted
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error occurred during deletion: {str(e)}'}), 500
    

# ---------------------------------------------------------------------------------------------------------------
# Read-only and Delete-all routes for FailedCOGS                                                                       |
# ---------------------------------------------------------------------------------------------------------------
# Read all
@app.route('/failed_cogs', methods=['GET'])
def get_all_failed_cogs():
    failed_cogs_records = FailedCOGS.query.all()
    return jsonify([record.to_dict() for record in failed_cogs_records])

# Read Partial - Multiple Ambiguous Filters 
@app.route('/failed_cogs/filter', methods=['GET'])
def get_failed_cogs():
    query = FailedCOGS.query

    conditions = []

    if 'sales_record_id' in request.args:
        conditions.append(FailedCOGS.sales_record_id.ilike(f"%{request.args.get('sales_record_id')}%"))  # Case-insensitive partial match
    if 'SKU' in request.args:
        conditions.append(FailedCOGS.sku.ilike(f"%{request.args.get('SKU')}%"))  # Case-insensitive partial match
    if 'sales_date' in request.args:
        sales_date = request.args.get('sales_date')
        conditions.append(FailedCOGS.sales_date == sales_date)  # Exact match

    if conditions:
        query = query.filter(and_(*conditions))

    failed_cogs_records = query.all()

    if not failed_cogs_records:
        return jsonify({'error': 'No FailedCOGS found with the given filters'}), 404

    return jsonify([record.to_dict() for record in failed_cogs_records])

# Delete all
@app.route('/failed_cogs/delete_all', methods=['DELETE'])
def delete_all_failed_cogs():
    try:
        # Delete all records
        num_deleted = db.session.query(FailedCOGS).delete()
        db.session.commit()

        return jsonify({
            'message': f'All records in the FailedCOGS table have been deleted.',
            'num_deleted': num_deleted
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error occurred during deletion: {str(e)}'}), 500
    
    
# ---------------------------------------------------------------------------------------------------------------
# Read-only and Delete-all routes for Inventory and InventoryRawMaterial                                         |
# ---------------------------------------------------------------------------------------------------------------
# Read all
@app.route('/inventory', methods=['GET'])
def get_all_inventory():
    inventory_items = Inventory.query.all()
    return jsonify([item.to_dict() for item in inventory_items])

# Read Partial - Ambiguous Filter
@app.route('/inventory/filter', methods=['GET'])
def get_inventory():
    query = Inventory.query

    conditions = []

    if 'SKU' in request.args:
        conditions.append(Inventory.SKU.ilike(f"%{request.args.get('SKU')}%"))  # Case-insensitive partial match

    if 'as_of_date' in request.args:
        conditions.append(Inventory.as_of_date == request.args.get('as_of_date'))  # Exact match

    if conditions:
        query = query.filter(and_(*conditions))

    inventory_items = query.all()

    if not inventory_items:
        return jsonify({'error': 'No inventory found with the given filters'}), 404

    return jsonify([item.to_dict() for item in inventory_items])

# Delete all
@app.route('/inventory/delete_all', methods=['DELETE'])
def delete_all_inventory():
    try:
        # Delete all records
        num_deleted = db.session.query(Inventory).delete()
        db.session.commit()

        return jsonify({
            'message': f'All records in the Inventory table have been deleted.',
            'num_deleted': num_deleted
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error occurred during deletion: {str(e)}'}), 500
    
# Read all
@app.route('/inventory_raw_material', methods=['GET'])
def get_all_inventory_raw_material():
    inventory_items = InventoryRawMaterial.query.all()
    return jsonify([item.to_dict() for item in inventory_items])

# Read Partial - Ambiguous Filter
@app.route('/inventory_raw_material/filter', methods=['GET'])
def get_inventory_raw_material():
    query = InventoryRawMaterial.query

    conditions = []

    if 'Product' in request.args:
        conditions.append(InventoryRawMaterial.Product.ilike(f"%{request.args.get('Product')}%"))  # Case-insensitive partial match

    if 'as_of_date' in request.args:
        conditions.append(InventoryRawMaterial.as_of_date == request.args.get('as_of_date'))  # Exact match

    if conditions:
        query = query.filter(and_(*conditions))

    inventory_items = query.all()

    if not inventory_items:
        return jsonify({'error': 'No inventory raw material found with the given filters'}), 404

    return jsonify([item.to_dict() for item in inventory_items])

# Delete all
@app.route('/inventory_raw_material/delete_all', methods=['DELETE'])
def delete_all_inventory_raw_material():
    try:
        # Delete all records
        num_deleted = db.session.query(InventoryRawMaterial).delete()
        db.session.commit()

        return jsonify({
            'message': f'All records in the InventoryRawMaterial table have been deleted.',
            'num_deleted': num_deleted
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error occurred during deletion: {str(e)}'}), 500


# ---------------------------------------------------------------------------------------------------------------
# Routes for FICO logic to generate ManufactureResult tables, COGS tables                                        |
# ---------------------------------------------------------------------------------------------------------------
@app.route('/manufacture_orders/re_rank', methods=['GET'])
def re_rank_manufacture_orders():
    try:
        with db.session.begin():
            # Create temporary table for ranking
            db.session.execute(text("""
                CREATE TEMPORARY TABLE rankedrows AS
                SELECT
                    id,
                    dense_rank() OVER (
                        ORDER BY manufacture_date, sku
                    ) AS new_manufacture_order_id
                FROM manufactureorders;
            """))

            # Update manufacture order IDs
            db.session.execute(text("""
                UPDATE manufactureorders
                SET manufacture_order_id = (
                    SELECT new_manufacture_order_id
                    FROM rankedrows
                    WHERE manufactureorders.id = rankedrows.id
                );
            """))

            # Drop temporary table
            db.session.execute(text("DROP TABLE IF EXISTS rankedrows;"))

        return jsonify({'message': 'Manufacture orders re-ranked successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
    

# ---------------------------------------------
# Helper functions for FIFO logic & batching    |
# ---------------------------------------------
def calculate_product_ratios(order_id, mo_data_df=None):
    # Use provided DataFrame or query database (for backward compatibility)
    if mo_data_df is not None:
        products_info = mo_data_df[['product', 'manufacture_quantity']].values.tolist()
    else:
        # Fallback to database query
        products_info = db.session.execute(text("""
            SELECT product, manufacture_quantity
                FROM manufactureorders
            WHERE manufacture_order_id = :order_id
            ORDER BY product;
        """), {'order_id': order_id}).fetchall()
    
    if not products_info:
        print(f"calculate_product_ratios for MO {order_id}: No products found!")
        return {}, 0
    
    min_quantity = min(qty for _, qty in products_info)
    
    product_ratios = {
        product: qty // min_quantity
        for product, qty in products_info
    }

    return product_ratios, min_quantity

def calculate_product_ratios_COGS(order_id, batch, completion_date, manufacture_orders_df=None, manufacture_results_df=None):
    """
    Calculate product ratios using DataFrames instead of database queries for performance.
    Falls back to database queries if DataFrames are not provided.
    """

    # normal manufacture order
    if order_id > 0:
        if manufacture_orders_df is not None:
            # Use DataFrame - much faster than database query
            order_products = manufacture_orders_df[
                manufacture_orders_df['manufacture_order_id'] == order_id
            ][['product', 'manufacture_quantity']]
            
            if order_products.empty:
                # Fallback to database if not found in DataFrame
                products_info = db.session.execute(text("""
                    SELECT product, manufacture_quantity
                            FROM manufactureorders
                            WHERE manufacture_order_id = :order_id
                            ORDER BY product;
                """), {'order_id': order_id}).fetchall()
            else:
                products_info = [(row['product'], row['manufacture_quantity']) for _, row in order_products.iterrows()]
        else:
            # Fallback to database query
            products_info = db.session.execute(text("""
                SELECT product, manufacture_quantity
                FROM manufactureorders
            WHERE manufacture_order_id = :order_id
            ORDER BY product;
        """), {'order_id': order_id}).fetchall()
        
        if not products_info:
            return {}, 0
        
        min_quantity = min(qty for _, qty in products_info)
        product_ratios = {
            product: qty // min_quantity
            for product, qty in products_info
        }
    else:
        if manufacture_results_df is not None:
            # Use DataFrame - much faster than database query
            batch_products = manufacture_results_df[
                (manufacture_results_df['manufacture_order_id'] == order_id) &
                (manufacture_results_df['manufacture_batch'] == batch) &
                (manufacture_results_df['manufacture_completion_date'] == completion_date)
            ][['product', 'fulfilled_quantity']]
            
            if batch_products.empty:
                # Fallback to database if not found in DataFrame
                products_info = db.session.execute(text("""
                    SELECT product, fulfilled_quantity
                            FROM manufactureresult
                            WHERE manufacture_order_id = :order_id and manufacture_batch = :batch and manufacture_completion_date = :completion_date
                            ORDER BY product;
                """), {'order_id': order_id, 'batch': batch, 'completion_date': completion_date}).fetchall()
            else:
                products_info = [(row['product'], row['fulfilled_quantity']) for _, row in batch_products.iterrows()]
        else:
            # Fallback to database query
            products_info = db.session.execute(text("""
                SELECT product, fulfilled_quantity
                FROM manufactureresult
            WHERE manufacture_order_id = :order_id and manufacture_batch = :batch and manufacture_completion_date = :completion_date
            ORDER BY product;
        """), {'order_id': order_id, 'batch': batch, 'completion_date': completion_date}).fetchall()
    
        if not products_info:
            return {}, 0
    
    min_quantity = min(qty for _, qty in products_info)
    product_ratios = {
        product: qty // min_quantity
        for product, qty in products_info
    }
    
    return product_ratios, min_quantity

def process_manufacture_batches(order_id, staged_updates, required_skus, product_ratios=None):
    if product_ratios is None:
        product_ratios, _ = calculate_product_ratios(order_id)
    else:
        # Use the provided product_ratios to avoid database query
        pass
    batch_number = 1
    final_updates = []

    # Group POs per product and sort them FIFO
    product_po_queues = {}
    for update in staged_updates:
        if update['product'] not in product_po_queues:
            product_po_queues[update['product']] = []
        product_po_queues[update['product']].append(update)

    for product in product_po_queues:
        product_po_queues[product].sort(key=lambda x: x['order_date'])

    fulfilled_skus = 0

    while fulfilled_skus < required_skus:
        max_skus = float('inf')
        current_pos = {}

        for product, ratio in product_ratios.items():
            # Skip POs that don't have enough for even 1 ratio unit
            while product_po_queues[product] and product_po_queues[product][0]['allocated_qty'] < ratio:
                product_po_queues[product].pop(0)

            if not product_po_queues[product]:
                return []  # No more usable POs for this product

            po = product_po_queues[product][0]
            possible_skus = po['allocated_qty'] // ratio

            if possible_skus == 0:
                return []  # Defensive: shouldn't hit this if while-loop above is correct

            current_pos[product] = po
            max_skus = min(max_skus, possible_skus)

        # Limit to how many SKUs still needed
        batch_skus = min(max_skus, required_skus - fulfilled_skus)

        # Consume from each product's current PO
        for product, ratio in product_ratios.items():
            po = current_pos[product]
            consume_qty = batch_skus * ratio

            batch_update = po.copy()
            batch_update['allocated_qty'] = consume_qty
            batch_update['manufacture_batch'] = batch_number
            batch_update['cost'] = consume_qty * po['unit_price']
            batch_update['unit_price'] = po['unit_price']
            final_updates.append(batch_update)

            po['allocated_qty'] -= consume_qty
            if po['allocated_qty'] == 0:
                product_po_queues[product].pop(0)

        fulfilled_skus += batch_skus
        batch_number += 1

    return final_updates
    
@app.route('/manufacture_result/generate', methods=['GET'])
def generate_manufacture_results():
    try:
        with db.session.begin():
            # Clear previous results
            db.session.execute(text("DELETE FROM cogs;"))
            db.session.execute(text("DELETE FROM failedcogs;"))
            db.session.execute(text("DELETE FROM manufactureresult;"))
            db.session.execute(text("DELETE FROM failedmanufactureresult;"))

            # Pre-fetch all data needed for processing
            print("Pre-fetching manufacture orders data...")
            manufacture_orders_df = pd.read_sql_query("""
                SELECT manufacture_order_id, sku, product, manufacture_quantity, manufacture_date
                FROM manufactureorders
                ORDER BY manufacture_order_id, product;
            """, db.engine)

            print("Pre-fetching purchase orders data...")
            purchase_orders_df = pd.read_sql_query("""
                SELECT *
                FROM purchaseorders
                ORDER BY product, order_date;
            """, db.engine)
            
            # Reset PO quantities in DataFrame (this will be applied when we replace the table)
            if not purchase_orders_df.empty:
                purchase_orders_df['quantity_left'] = purchase_orders_df['purchase_quantity']
                print("✅ Reset purchase order quantities in DataFrame")

            # Convert date columns to proper datetime format
            if not manufacture_orders_df.empty:
                manufacture_orders_df['manufacture_date'] = pd.to_datetime(manufacture_orders_df['manufacture_date']).dt.date
            if not purchase_orders_df.empty:
                purchase_orders_df['order_date'] = pd.to_datetime(purchase_orders_df['order_date']).dt.date

            # Get unique order IDs
            order_ids = manufacture_orders_df['manufacture_order_id'].unique() if not manufacture_orders_df.empty else []

            # Collect all results for batch insertion at the end
            all_failed_results = []
            all_manufacture_results = []

            import time
            start_time = time.time()
            print(f"🚀 Starting processing of {len(order_ids)} manufacture orders at {time.strftime('%Y-%m-%d %H:%M:%S')}")
            processed_count = 0
            successful_count = 0
            failed_count = 0
            
            for order_id in order_ids:
                # Convert numpy types to native Python types
                order_id = int(order_id)
                processed_count += 1
                staged_updates = []

                # Step 1: Get required product quantities from DataFrame
                mo_order_data = manufacture_orders_df[manufacture_orders_df['manufacture_order_id'] == order_id].copy()
                
                if mo_order_data.empty:
                    print(f"[{processed_count}/{len(order_ids)}] MO {order_id}: No data found, skipping")
                    continue
                
                # Progress logging every 100 orders or for specific intervals
                if processed_count % 100 == 0 or processed_count <= 10:
                    progress_pct = (processed_count / len(order_ids)) * 100
                    print(f"[{processed_count}/{len(order_ids)}] ({progress_pct:.1f}%) Processing MO {order_id}... (Success: {successful_count}, Failed: {failed_count})")
                
                # Major milestone logging every 1000 orders
                if processed_count % 1000 == 0:
                    print(f"\n🎯 MILESTONE: {processed_count} orders processed ({(processed_count/len(order_ids)*100):.1f}% complete)")
                    print(f"   📊 Current Stats: ✅ {successful_count} successful, ❌ {failed_count} failed")
                    print(f"   💾 Database operations optimized with batch processing")
                    print("   ⏱️  Process continuing...\n")

                # Step 2: Compute product ratios and required SKU count
                try:
                    product_ratios, _ = calculate_product_ratios(order_id, mo_order_data)
                    
                    product_qtys = []
                    for _, row in mo_order_data.iterrows():
                        product_qtys.append((row['product'], row['manufacture_quantity']))
                    
                    # Check if all products exist in product_ratios
                    missing_products = []
                    for product, qty in product_qtys:
                        if product not in product_ratios:
                            missing_products.append(product)
                    
                    if missing_products:
                        print(f"[{processed_count}/{len(order_ids)}] MO {order_id}: FAILED - Missing products in ratios: {missing_products}")
                        failed_count += 1
                        # Collect failed results for batch insertion
                        for _, row in mo_order_data.iterrows():
                            manufacture_date = row['manufacture_date']
                            if isinstance(manufacture_date, datetime):
                                manufacture_date = manufacture_date.strftime('%Y-%m-%d')
                            all_failed_results.append({
                                'order_id': order_id,
                                'sku': str(row['sku']),
                                'product': str(row['product']),
                                'manufacture_date': manufacture_date,
                                'failure_reason': f'Missing product in ratios calculation: {missing_products}'
                            })
                        continue  # Skip to next order
                    
                    required_skus = min(qty // product_ratios[product] for product, qty in product_qtys)
                    
                except ZeroDivisionError as e:
                    print(f"[{processed_count}/{len(order_ids)}] MO {order_id}: FAILED - ZeroDivisionError in ratio calculation: {e}")
                    failed_count += 1
                    required_skus = 0
                except Exception as e:
                    print(f"[{processed_count}/{len(order_ids)}] MO {order_id}: FAILED - Error in ratio calculation: {e}")
                    failed_count += 1
                    # Collect failed results for batch insertion
                    for _, row in mo_order_data.iterrows():
                        manufacture_date = row['manufacture_date']
                        if isinstance(manufacture_date, datetime):
                            manufacture_date = manufacture_date.strftime('%Y-%m-%d')
                        all_failed_results.append({
                            'order_id': order_id,
                            'sku': str(row['sku']),
                            'product': str(row['product']),
                            'manufacture_date': manufacture_date,
                            'failure_reason': f'Error in ratio calculation: {str(e)}'
                        })
                    continue  # Skip to next order

                # Step 3: Prepare raw PO pool (no allocation yet) using DataFrame filtering
                for _, row in mo_order_data.iterrows():
                    sku = str(row['sku'])
                    product = str(row['product'])
                    manufacture_date = row['manufacture_date']
                    
                    if isinstance(manufacture_date, str):
                        manufacture_date = datetime.strptime(manufacture_date, '%Y-%m-%d').date()

                    try:
                        # Filter purchase orders from DataFrame for this product
                        # Convert manufacture_date to pandas datetime for comparison
                        manufacture_datetime = pd.to_datetime(manufacture_date)
                        cutoff_date = (manufacture_datetime + pd.Timedelta(days=5)).date()
                        
                        product_pos = purchase_orders_df[
                            (purchase_orders_df['product'] == product) & 
                            (purchase_orders_df['quantity_left'] > 0) & 
                            (purchase_orders_df['order_date'] <= cutoff_date)
                        ].copy()
                        
                        # Sort by order_date for FIFO
                        product_pos = product_pos.sort_values('order_date')

                        for _, po_row in product_pos.iterrows():
                            staged_updates.append({
                                'order_id': order_id,
                                'sku': sku,
                                'product': product,
                                'po_id': str(po_row['purchase_order_id']),
                                'allocated_qty': int(po_row['quantity_left']),
                                'unit_price': float(po_row['purchase_unit_price']) * float(po_row['fx_rate']),
                                'fx_rate': float(po_row['fx_rate']),
                                'cost': int(po_row['quantity_left']) * float(po_row['purchase_unit_price']) * float(po_row['fx_rate']),
                                'completion_date': manufacture_date,
                                'order_date': po_row['order_date']
                            })
                    except Exception as e:
                        print(f"MO {order_id}: Error processing POs for product '{product}': {e}")
                        # Continue with other products rather than failing the entire MO

                # Step 4: Attempt batching
                try:
                    processed_updates = process_manufacture_batches(order_id, staged_updates, required_skus, product_ratios)
                except Exception as e:
                    print(f"[{processed_count}/{len(order_ids)}] MO {order_id}: ERROR in batching process: {e}")
                    processed_updates = []

                if processed_updates:
                    # Collect manufacture results for batch insertion later
                    all_manufacture_results.extend(processed_updates)
                    
                    # Update the DataFrame to reflect consumed quantities for next MOs
                    for update_record in processed_updates:
                        po_id = update_record['po_id']
                        product = update_record['product']
                        allocated_qty = update_record['allocated_qty']
                        
                        # Find and update the corresponding row in purchase_orders_df
                        mask = (purchase_orders_df['purchase_order_id'] == po_id) & (purchase_orders_df['product'] == product)
                        if mask.any():
                            # Get current quantity before update for logging
                            current_qty = purchase_orders_df.loc[mask, 'quantity_left'].iloc[0]
                            purchase_orders_df.loc[mask, 'quantity_left'] -= allocated_qty
                            new_qty = purchase_orders_df.loc[mask, 'quantity_left'].iloc[0]
                            
                            # Log DataFrame updates for debugging (only for first few records)
                            if processed_count <= 5:
                                print(f"    Updated PO {po_id} {product}: {current_qty} -> {new_qty} (consumed: {allocated_qty})")
                    
                    successful_count += 1
                    if processed_count % 100 == 0 or processed_count <= 10:
                        print(f"[{processed_count}/{len(order_ids)}] MO {order_id}: SUCCESS - Collected {len(processed_updates)} manufacture results for batch processing")
                else:
                    print(f"[{processed_count}/{len(order_ids)}] MO {order_id}: FAILED - Insufficient stock or batching failed")
                    failed_count += 1
                    for _, row in mo_order_data.iterrows():
                        manufacture_date = row['manufacture_date']
                        if isinstance(manufacture_date, datetime):
                            manufacture_date = manufacture_date.strftime('%Y-%m-%d')
                        all_failed_results.append({
                            'order_id': order_id,
                            'sku': str(row['sku']),
                            'product': str(row['product']),
                            'manufacture_date': manufacture_date,
                            'failure_reason': 'Insufficient stock to fulfill order'
                        })

            # Final processing summary
            end_time = time.time()
            duration = end_time - start_time
            print(f"\n🎉 === PROCESSING COMPLETE ===")
            print(f"⏱️  Total Duration: {duration:.2f} seconds ({duration/60:.1f} minutes)")
            print(f"📦 Total Orders Processed: {processed_count}")
            print(f"✅ Successful: {successful_count}")
            print(f"❌ Failed: {failed_count}")
            print(f"📊 Success Rate: {(successful_count/processed_count*100):.1f}%" if processed_count > 0 else "N/A")
            print(f"⚡ Processing Speed: {(processed_count/duration):.1f} orders/second" if duration > 0 else "N/A")
            
            # Replace entire purchase orders table with updated DataFrame using high-performance bulk insert
            if not purchase_orders_df.empty:
                print(f"Replacing purchase orders table with updated DataFrame ({len(purchase_orders_df)} records)...")
                
                # Remove generated columns before inserting (PostgreSQL will auto-calculate them)
                columns_to_exclude = ['total_cost']  # Add other generated columns if any
                df_to_insert = purchase_orders_df.drop(columns=[col for col in columns_to_exclude if col in purchase_orders_df.columns])
                
                # Convert DataFrame to list of dictionaries for SQLAlchemy core bulk insert
                records_to_insert = df_to_insert.to_dict('records')
                
                # Clear the existing table and bulk insert using SQLAlchemy core (same as bulk create endpoint)
                db.session.execute(text("DELETE FROM purchaseorders;"))
                db.session.execute(
                    PurchaseOrder.__table__.insert(),
                    records_to_insert
                )
                print("✅ Purchase orders table successfully updated with high-performance bulk insert")

            # High-performance bulk insert for manufacture results using SQLAlchemy core
            if all_manufacture_results:
                total_results = len(all_manufacture_results)
                print(f"\nBulk inserting {total_results} manufacture results using high-performance method...")
                
                # Prepare records for SQLAlchemy core bulk insert (same format as bulk create endpoints)
                manufacture_records = []
                for record in all_manufacture_results:
                    manufacture_records.append({
                        'manufacture_order_id': record['order_id'],
                        'manufacture_batch': record['manufacture_batch'],
                        'sku': record['sku'],
                        'product': record['product'],
                        'fulfilled_by_po': record['po_id'],
                        'fulfilled_quantity': record['allocated_qty'],
                        'cost': record['cost'],
                        'unit_cost': record['unit_price'],
                        'manufacture_completion_date': record['completion_date'],
                        'status': 'COMPLETED',
                        'quantity_left': record['allocated_qty']
                    })
                
                # Single bulk insert operation (same as bulk create endpoint performance)
                db.session.execute(
                    ManufactureResult.__table__.insert(),
                    manufacture_records
                )
                print(f"✅ Successfully bulk inserted {total_results} manufacture results")

            # High-performance bulk insert for failed results using SQLAlchemy core
            if all_failed_results:
                total_failed = len(all_failed_results)
                print(f"Bulk inserting {total_failed} failed manufacture results using high-performance method...")
                
                # Records are already in the correct format for SQLAlchemy core bulk insert
                # Just need to map the field names to match the model
                failed_records = []
                for record in all_failed_results:
                    failed_records.append({
                        'manufacture_order_id': record['order_id'],
                        'sku': record['sku'],
                        'product': record['product'],
                        'manufacture_date': record['manufacture_date'],
                        'failure_reason': record['failure_reason']
                    })
                
                # Single bulk insert operation (same as bulk create endpoint performance)
                db.session.execute(
                    FailedManufactureResult.__table__.insert(),
                    failed_records
                )
                print(f"✅ Successfully bulk inserted {total_failed} failed manufacture results")

        return jsonify({
            'message': 'Manufacture results generated successfully',
            'summary': {
                'total_processed': processed_count,
                'successful': successful_count,
                'failed': failed_count,
                'success_rate': round((successful_count/processed_count*100), 1) if processed_count > 0 else 0
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error in generate_manufacture_results: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/manufacture_result/update_with_stock_exchange', methods=['GET'])
def update_manufacture_results_with_stock_exchange():
    try:
        with db.session.begin():

            # Clear all failed stock exchanges
            db.session.execute(text("""
                DELETE FROM failedstockexchange;
            """))

            # Get all stock exchanges
            stock_exchanges = db.session.execute(text("""
                SELECT id, sku_original, sku_new, quantity, exchange_date
                FROM stockexchange
                ORDER BY exchange_date;
            """)).fetchall()

            mo_number = -2
            for exchange_id, sku_original, sku_new, exchange_quantity, exchange_date in stock_exchanges:
                remaining_qty = exchange_quantity
                staged_updates = []

                # Get all manufacture results for the original SKU
                manufacture_results = db.session.execute(text("""
                    SELECT 
                        manufacture_order_id,
                        manufacture_batch,
                        sku,
                        product,
                        fulfilled_by_PO,
                        fulfilled_quantity,
                        cost,
                        unit_cost,
                        manufacture_completion_date,
                        status,
                        quantity_left
                    FROM manufactureresult
                    WHERE sku = :sku AND quantity_left > 0 AND manufacture_completion_date <= CAST(:exchange_date AS DATE)
                    ORDER BY manufacture_completion_date DESC, manufacture_batch DESC, manufacture_order_id DESC;
                """), {
                    'sku': sku_original,
                    'exchange_date': exchange_date
                }).fetchall()

                # Check if any manufacture results are available
                if not manufacture_results:
                    # Store failed exchange in FailedStockExchange table
                    db.session.execute(text("""
                        INSERT INTO FailedStockExchange (
                            sku_original, sku_new, quantity, exchange_date
                        ) VALUES (:sku_original, :sku_new, :quantity, :exchange_date);
                    """), {
                        'sku_original': sku_original,
                        'sku_new': sku_new,
                        'quantity': exchange_quantity,
                        'exchange_date': exchange_date
                    })
                    print(f"Failed to process exchange ID {exchange_id}. "
                          f"No available stock found for SKU {sku_original}")
                    continue

                # Group results by MO ID and batch
                grouped_results = {}
                for result in manufacture_results:
                    mo_id, batch = result[0], result[1]
                    key = (mo_id, batch)
                    if key not in grouped_results:
                        grouped_results[key] = []
                    grouped_results[key].append(result)

                # Process each group and create staged updates
                batch_number = 1
                exchange_fulfilled = False
                
                for (mo_id, batch), group in grouped_results.items():
                    if remaining_qty <= 0:
                        exchange_fulfilled = True
                        break

                    # Calculate product ratios for this manufacture order
                    product_ratios, min_quantity = calculate_product_ratios(mo_id)
                    
                    # Find how much we can consume from this group
                    min_available = float('inf')
                    for result in group:
                        product = result[3]
                        quantity = int(result[5])
                        if product in product_ratios:
                            possible_skus = quantity // product_ratios[product]
                            min_available = min(min_available, possible_skus)

                    # Calculate how much to consume
                    to_consume = min(remaining_qty, min_available)
                    if to_consume <= 0:
                        continue

                    # Create staged updates for each product in the group
                    for result in group:
                        mo_id = result[0]
                        batch = result[1]
                        product = result[3]
                        po_id = result[4]
                        current_cost = result[6]
                        unit_cost = result[7]

                        if product in product_ratios:
                            consume_qty = to_consume * product_ratios[product]

                            # Stage update for existing record
                            staged_updates.append({
                                "type": "update",
                                "mo_id": mo_id,
                                "batch": batch,
                                "product": product,
                                "po_id": po_id,
                                "consume_qty": consume_qty,
                                "new_cost": current_cost - consume_qty * unit_cost
                            })

                            # Stage insert for new record
                            staged_updates.append({
                                "type": "insert",
                                "mo_id": mo_number,
                                "batch": batch_number,
                                "sku": sku_new,
                                "product": product,
                                "po_id": po_id,
                                "quantity": consume_qty,
                                "cost": consume_qty * unit_cost,
                                "unit_cost": unit_cost,
                                "completion_date": exchange_date
                            })

                    remaining_qty -= to_consume
                    batch_number = batch_number + 1
                mo_number = mo_number -1

                # Only process updates if the exchange can be fully fulfilled
                if remaining_qty <= 0:
                    # Process all staged updates
                    for update in staged_updates:
                        if update["type"] == "update":
                            db.session.execute(text("""
                                UPDATE manufactureresult
                                SET fulfilled_quantity = fulfilled_quantity - :consume_qty,
                                    quantity_left = quantity_left - :consume_qty,
                                    cost = :new_cost
                                WHERE manufacture_order_id = :mo_id 
                                    AND manufacture_batch = :batch
                                    AND product = :product
                                    AND fulfilled_by_po = :po_id;
                            """), update)
                        else:  # insert
                            db.session.execute(text("""
                                INSERT INTO manufactureresult (
                                    manufacture_order_id, manufacture_batch, sku, product,
                                    fulfilled_by_po, fulfilled_quantity, cost, unit_cost,
                                    manufacture_completion_date, status, quantity_left
                                ) VALUES (
                                    :mo_id, :batch, :sku, :product,
                                    :po_id, :quantity, :cost, :unit_cost,
                                    :completion_date, 'COMPLETED', :quantity
                                );
                            """), update)
                    print(f"Successfully processed exchange ID {exchange_id}")
                else:
                    # Store failed exchange in FailedStockExchange table
                    db.session.execute(text("""
                        INSERT INTO FailedStockExchange (
                            sku_original, sku_new, quantity, exchange_date
                        ) VALUES (:sku_original, :sku_new, :quantity, :exchange_date);
                    """), {
                        'sku_original': sku_original,
                        'sku_new': sku_new,
                        'quantity': exchange_quantity,
                        'exchange_date': exchange_date
                    })

        return jsonify({'message': 'Stock exchanges processed successfully'}), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error in update_manufacture_results_with_stock_exchange: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/cogs/generate', methods=['GET'])
def generate_cogs():
    try:
        with db.session.begin():
            # Reset quantities will be handled in DataFrames (applied when we replace tables)
            # Manufacture Result Reset is handled by calling 
            # app.route('/manufacture_result/generate', methods=['GET'])
            # and app.route('/manufacture_result/update_with_stock_exchange', methods=['GET'])
            # in the frontend refresh button

            # Clear existing COGS
            db.session.execute(text("DELETE FROM cogs;"))
            db.session.execute(text("DELETE FROM failedcogs;"))

            # Pre-fetch all data needed for COGS processing
            print("Pre-fetching sales records data...")
            sales_records_df = pd.read_sql_query("""
                SELECT sales_record_id, sku, quantity_sold, sales_date
                FROM salesrecords
                ORDER BY sales_date;
            """, db.engine)
            
            print("Pre-fetching manufacture orders data for product ratios...")
            manufacture_orders_df = pd.read_sql_query("""
                SELECT manufacture_order_id, product, manufacture_quantity
                FROM manufactureorders
                ORDER BY manufacture_order_id, product;
            """, db.engine)
            
            print("Pre-fetching manufacture results data...")
            manufacture_results_df = pd.read_sql_query("""
                SELECT *
                FROM manufactureresult
                ORDER BY sku, manufacture_completion_date;
            """, db.engine)
            
            print("Pre-fetching returns data...")
            returns_df = pd.read_sql_query("""
                SELECT *
                FROM returns
                ORDER BY sku, return_date;
            """, db.engine)
            
            print("Pre-fetching stock initiation data...")
            stock_initiation_df = pd.read_sql_query("""
                SELECT *
                FROM stockinitiationaddition
                ORDER BY sku, manufacture_completion_date;
            """, db.engine)
            
            # Reset quantities in DataFrames (will be applied when we replace tables)
            if not returns_df.empty:
                returns_df['quantity_left'] = returns_df['return_quantity']
                print("✅ Reset return quantities in DataFrame")
            
            if not stock_initiation_df.empty:
                stock_initiation_df['quantity_left'] = stock_initiation_df['fulfilled_quantity']
                print("✅ Reset stock initiation quantities in DataFrame")

            # Convert date columns to proper datetime format
            if not sales_records_df.empty:
                sales_records_df['sales_date'] = pd.to_datetime(sales_records_df['sales_date']).dt.date
            if not manufacture_results_df.empty:
                manufacture_results_df['manufacture_completion_date'] = pd.to_datetime(manufacture_results_df['manufacture_completion_date']).dt.date
            if not returns_df.empty:
                returns_df['return_date'] = pd.to_datetime(returns_df['return_date']).dt.date
            if not stock_initiation_df.empty:
                stock_initiation_df['manufacture_completion_date'] = pd.to_datetime(stock_initiation_df['manufacture_completion_date']).dt.date

            # Collect all COGS and failed COGS for batch insertion
            all_cogs_updates = []
            all_failed_cogs = []
            all_return_updates = []
            all_initiation_updates = []
            all_manufacture_updates = []

            import time
            start_time = time.time()
            print(f"🚀 Starting COGS processing for {len(sales_records_df)} sales records at {time.strftime('%Y-%m-%d %H:%M:%S')}")
            processed_count = 0
            successful_count = 0
            failed_count = 0

            # Process each sales record using DataFrame
            for _, sales_row in sales_records_df.iterrows():
                sales_record_id = str(sales_row['sales_record_id'])  # Keep as string - can contain hyphens like Amazon order IDs
                SKU = str(sales_row['sku'])
                quantity_sold = int(sales_row['quantity_sold'])
                sales_date = sales_row['sales_date']
                
                processed_count += 1
                
                # Progress logging
                if processed_count % 100 == 0 or processed_count <= 10:
                    progress_pct = (processed_count / len(sales_records_df)) * 100
                    print(f"[{processed_count}/{len(sales_records_df)}] ({progress_pct:.1f}%) Processing SKU {SKU}... (Success: {successful_count}, Failed: {failed_count})")
                
                # Major milestone logging every 1000 records
                if processed_count % 1000 == 0:
                    print(f"\n🎯 MILESTONE: {processed_count} sales records processed ({(processed_count/len(sales_records_df)*100):.1f}% complete)")
                    print(f"   📊 Current Stats: ✅ {successful_count} successful, ❌ {failed_count} failed")
                    print("   ⏱️  Process continuing...\n")

                # Check available inventory using DataFrames
                # Filter manufacture results for this SKU and sales date (only records with quantity > 0)
                manufacture_qty = manufacture_results_df[
                    (manufacture_results_df['sku'] == SKU) & 
                    (manufacture_results_df['manufacture_completion_date'] <= sales_date) &
                    (manufacture_results_df['quantity_left'] > 0)
                ]['quantity_left'].sum()
                
                # Filter returns for this SKU and sales date (only records with quantity > 0)
                returns_qty = returns_df[
                    (returns_df['sku'] == SKU) & 
                    (returns_df['return_date'] <= sales_date) &
                    (returns_df['quantity_left'] > 0)
                ]['quantity_left'].sum()
                
                # Filter stock initiation for this SKU and sales date (only records with quantity > 0)
                initiation_qty = stock_initiation_df[
                    (stock_initiation_df['sku'] == SKU) & 
                    (stock_initiation_df['manufacture_completion_date'] <= sales_date) &
                    (stock_initiation_df['quantity_left'] > 0)
                ]['quantity_left'].sum()
                
                total_available = manufacture_qty + returns_qty + initiation_qty

                # If no inventory available, record as failed immediately
                if total_available == 0:
                    all_failed_cogs.append({
                        'sales_record_id': sales_record_id,
                        'sales_date': sales_date,
                        'sku': SKU,
                        'quantity_sold': quantity_sold,
                        'failed_quantity': quantity_sold,
                        'failure_reason': 'No available inventory'
                    })
                    failed_count += 1
                    continue

                remaining_qty = quantity_sold
                cogs_updates = []

                # Get available inventory from DataFrames and combine them
                available_inventory = []
                
                # Add returns inventory
                available_returns = returns_df[
                    (returns_df['sku'] == SKU) & 
                    (returns_df['return_date'] <= sales_date) &
                    (returns_df['quantity_left'] > 0)
                ].copy()
                
                for _, row in available_returns.iterrows():
                    try:
                        available_inventory.append({
                            'source': 'return',
                            'order_id': 0,
                            'batch': 0,
                            'completion_date': row['return_date'],
                            'source_id': str(row['return_order_id']),
                            'quantity_left': int(row['quantity_left']),
                            'unit_cost': float(row['return_unit_price']) * float(row['fx_rate'])
                        })
                    except (ValueError, TypeError) as e:
                        print(f"Warning: Skipping return record due to data conversion error: {e}")
                
                # Add manufacture results inventory  
                available_manufacture = manufacture_results_df[
                    (manufacture_results_df['sku'] == SKU) & 
                    (manufacture_results_df['manufacture_completion_date'] <= sales_date) &
                    (manufacture_results_df['quantity_left'] > 0)
                ].copy()
                
                for _, row in available_manufacture.iterrows():
                    try:
                        available_inventory.append({
                            'source': 'manufacture',
                            'order_id': int(row['manufacture_order_id']),
                            'batch': int(row['manufacture_batch']),
                            'completion_date': row['manufacture_completion_date'],
                            'source_id': str(row['manufacture_order_id']),
                            'quantity_left': int(row['quantity_left']),
                            'unit_cost': float(row['unit_cost'])
                        })
                    except (ValueError, TypeError) as e:
                        print(f"Warning: Skipping manufacture record due to data conversion error: {e}")
                
                # Add stock initiation inventory
                available_initiation = stock_initiation_df[
                    (stock_initiation_df['sku'] == SKU) & 
                    (stock_initiation_df['manufacture_completion_date'] <= sales_date) &
                    (stock_initiation_df['quantity_left'] > 0)
                ].copy()
                
                for _, row in available_initiation.iterrows():
                    try:
                        available_inventory.append({
                            'source': 'initiation',
                            'order_id': int(row['result_id']),
                            'batch': int(row['manufacture_batch']),
                            'completion_date': row['manufacture_completion_date'],
                            'source_id': str(row['result_id']),
                            'quantity_left': int(row['quantity_left']),
                            'unit_cost': float(row['unit_cost'])
                        })
                    except (ValueError, TypeError) as e:
                        print(f"Warning: Skipping initiation record due to data conversion error: {e}")
                
                # Sort by completion date for FIFO
                available_inventory.sort(key=lambda x: x['completion_date'])

                for inv_item in available_inventory:
                    if remaining_qty == 0:
                        break

                    source = inv_item['source']
                    order_id = inv_item['order_id']
                    batch = inv_item['batch']
                    source_id = inv_item['source_id']
                    available_qty = inv_item['quantity_left']
                    unit_cost = inv_item['unit_cost']
                    completion_date = inv_item['completion_date']

                    allocated_qty = min(remaining_qty, available_qty)
                    remaining_qty -= allocated_qty
                    
                    if source == 'return':
                        # For returns, we don't need product ratios
                        cogs_updates.append({
                            'sales_record_id': sales_record_id,
                            'manufacture_order_id': 0,
                            'manufacture_batch': 0,
                            'sku': SKU,
                            'product': SKU,
                            'fulfilled_by_po': source_id,
                            'consumed_quantity': allocated_qty,
                            'cost': allocated_qty * float(unit_cost),
                            'sales_date': sales_date
                        })
                    elif source == 'initiation':
                        # For stock initiation, we don't need product ratios
                        cogs_updates.append({
                            'sales_record_id': sales_record_id,
                            'manufacture_order_id': -1,
                            'manufacture_batch': -1,
                            'sku': SKU,
                            'product': SKU,
                            'fulfilled_by_po': 'INITIATION & ADDITION ' + source_id,
                            'consumed_quantity': allocated_qty,
                            'cost': allocated_qty * float(unit_cost),
                            'sales_date': sales_date
                        })
                    else:
                        # Get product ratios for manufacture orders using DataFrames for performance
                        product_ratios,_ = calculate_product_ratios_COGS(order_id, batch, completion_date, manufacture_orders_df, manufacture_results_df)
                        
                        # Get all products used in this batch from DataFrame
                        batch_products = manufacture_results_df[
                            (manufacture_results_df['manufacture_order_id'] == order_id) &
                            (manufacture_results_df['manufacture_batch'] == batch)
                        ][['product', 'fulfilled_by_po', 'unit_cost']].drop_duplicates()

                        for _, product_row in batch_products.iterrows():
                            product = str(product_row['product'])
                            po_id = str(product_row['fulfilled_by_po'])
                            product_unit_cost = float(product_row['unit_cost'])
                            
                            ratio = product_ratios[product]
                            consumed_qty = allocated_qty * ratio
                            
                            cogs_updates.append({
                                'sales_record_id': sales_record_id,
                                'manufacture_order_id': order_id,
                                'manufacture_batch': batch,
                                'sku': SKU,
                                'product': product,
                                'fulfilled_by_po': po_id,
                                'consumed_quantity': consumed_qty,
                                'cost': consumed_qty * float(product_unit_cost),
                                'sales_date': sales_date
                            })

                # Collect COGS updates for batch processing
                if cogs_updates:
                    all_cogs_updates.extend(cogs_updates)
                    successful_count += 1
                    
                    # Separate updates by source type for batch processing and update DataFrames
                    for update in cogs_updates:
                        if update.get('manufacture_order_id') == 0:  # Return source
                            all_return_updates.append(update)
                            
                            # Update returns DataFrame for next sales records
                            return_mask = (returns_df['return_order_id'] == update['fulfilled_by_po']) & (returns_df['sku'] == update['sku'])
                            if return_mask.any():
                                returns_df.loc[return_mask, 'quantity_left'] -= update['consumed_quantity']
                                
                        elif update.get('manufacture_order_id') == -1:  # Stock Initiation source
                            try:
                                result_id_str = update['fulfilled_by_po'].replace('INITIATION & ADDITION ', '')
                                result_id_int = int(result_id_str)
                                all_initiation_updates.append({
                                    **update,
                                    'result_id': result_id_int
                                })
                                
                                # Update stock initiation DataFrame for next sales records
                                initiation_mask = (stock_initiation_df['result_id'] == result_id_int) & (stock_initiation_df['sku'] == update['sku'])
                                if initiation_mask.any():
                                    stock_initiation_df.loc[initiation_mask, 'quantity_left'] -= update['consumed_quantity']
                                    
                            except ValueError as e:
                                print(f"Warning: Could not convert result_id '{result_id_str}' to integer for initiation update: {e}")
                                # Skip this update if result_id cannot be converted
                        else:  # Manufacture source
                            all_manufacture_updates.append(update)
                            
                            # Update manufacture results DataFrame for next sales records
                            manufacture_mask = (
                                (manufacture_results_df['manufacture_order_id'] == update['manufacture_order_id']) &
                                (manufacture_results_df['manufacture_batch'] == update['manufacture_batch']) &
                                (manufacture_results_df['sku'] == update['sku']) &
                                (manufacture_results_df['product'] == update['product']) &
                                (manufacture_results_df['fulfilled_by_po'] == update['fulfilled_by_po'])
                            )
                            if manufacture_mask.any():
                                manufacture_results_df.loc[manufacture_mask, 'quantity_left'] -= update['consumed_quantity']

                # Record failed portion if any
                if remaining_qty > 0:
                    all_failed_cogs.append({
                        'sales_record_id': sales_record_id,
                        'sales_date': sales_date,
                        'sku': SKU,
                        'quantity_sold': quantity_sold,
                        'failed_quantity': remaining_qty,
                        'failure_reason': 'Insufficient stock to fulfill order'
                    })
                    
                    if remaining_qty == quantity_sold:  # Complete failure
                        failed_count += 1

            # Final processing summary
            end_time = time.time()
            duration = end_time - start_time
            print(f"\n🎉 === COGS PROCESSING COMPLETE ===")
            print(f"⏱️  Total Duration: {duration:.2f} seconds ({duration/60:.1f} minutes)")
            print(f"📦 Total Sales Records Processed: {processed_count}")
            print(f"✅ Successful: {successful_count}")
            print(f"❌ Failed: {failed_count}")
            print(f"📊 Success Rate: {(successful_count/processed_count*100):.1f}%" if processed_count > 0 else "N/A")
            print(f"⚡ Processing Speed: {(processed_count/duration):.1f} records/second" if duration > 0 else "N/A")

            # High-performance bulk insert for COGS records using SQLAlchemy core
            if all_cogs_updates:
                total_cogs = len(all_cogs_updates)
                print(f"Bulk inserting {total_cogs} COGS records using high-performance method...")
                
                # Prepare records for SQLAlchemy core bulk insert
                cogs_records = []
                for record in all_cogs_updates:
                    cogs_records.append({
                        'sales_record_id': record['sales_record_id'],
                        'sales_date': record['sales_date'],
                        'sku': record['sku'],
                        'quantity_sold': record['consumed_quantity'],
                        'result_id': record['manufacture_order_id'],
                        'manufacture_batch': record['manufacture_batch'],
                        'product': record['product'],
                        'fulfilled_by_po': record['fulfilled_by_po'],
                        'cogs': record['cost']
                    })
                
                # Single bulk insert operation (same as bulk create endpoint performance)
                db.session.execute(
                    COGS.__table__.insert(),
                    cogs_records
                )
                print(f"✅ Successfully bulk inserted {total_cogs} COGS records")

            # Replace entire returns table with updated DataFrame using high-performance bulk insert
            if not returns_df.empty:
                print(f"Replacing returns table with updated DataFrame ({len(returns_df)} records)...")
                
                # Convert DataFrame to list of dictionaries for SQLAlchemy core bulk insert
                returns_records = returns_df.to_dict('records')
                
                # Clear the existing table and bulk insert using SQLAlchemy core
                db.session.execute(text("DELETE FROM returns;"))
                db.session.execute(
                    Return.__table__.insert(),
                    returns_records
                )
                print("✅ Returns table successfully updated with high-performance bulk insert")
            
            # Replace entire stock initiation table with updated DataFrame using high-performance bulk insert
            if not stock_initiation_df.empty:
                print(f"Replacing stock initiation table with updated DataFrame ({len(stock_initiation_df)} records)...")
                
                # Convert DataFrame to list of dictionaries for SQLAlchemy core bulk insert
                initiation_records = stock_initiation_df.to_dict('records')
                
                # Clear the existing table and bulk insert using SQLAlchemy core
                db.session.execute(text("DELETE FROM stockinitiationaddition;"))
                db.session.execute(
                    ManufactureStockInitiationAddition.__table__.insert(),
                    initiation_records
                )
                print("✅ Stock initiation table successfully updated with high-performance bulk insert")
            
            # Replace entire manufacture results table with updated DataFrame using high-performance bulk insert
            if not manufacture_results_df.empty:
                print(f"Replacing manufacture results table with updated DataFrame ({len(manufacture_results_df)} records)...")
                
                # Convert DataFrame to list of dictionaries for SQLAlchemy core bulk insert
                manufacture_records = manufacture_results_df.to_dict('records')
                
                # Clear the existing table and bulk insert using SQLAlchemy core
                db.session.execute(text("DELETE FROM manufactureresult;"))
                db.session.execute(
                    ManufactureResult.__table__.insert(),
                    manufacture_records
                )
                print("✅ Manufacture results table successfully updated with high-performance bulk insert")

            # High-performance bulk insert for failed COGS records using SQLAlchemy core
            if all_failed_cogs:
                total_failed = len(all_failed_cogs)
                print(f"Bulk inserting {total_failed} failed COGS records using high-performance method...")
                
                # Records are already in the correct format for SQLAlchemy core bulk insert
                # Single bulk insert operation (same as bulk create endpoint performance)
                db.session.execute(
                    FailedCOGS.__table__.insert(),
                    all_failed_cogs
                )
                print(f"✅ Successfully bulk inserted {total_failed} failed COGS records")

        return jsonify({
            'message': 'COGS generated successfully',
            'summary': {
                'total_processed': processed_count,
                'successful': successful_count,
                'failed': failed_count,
                'success_rate': round((successful_count/processed_count*100), 1) if processed_count > 0 else 0,
                'cogs_records_created': len(all_cogs_updates),
                'failed_cogs_records': len(all_failed_cogs)
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error in generate_cogs: {str(e)}")  # Add this for debugging
        return jsonify({'error': str(e)}), 500
    

# ---------------------------------------------------------------------------------------------------------------
# Routes for generate Inventory and InventoryRawMaterial                                                         |
# ---------------------------------------------------------------------------------------------------------------
# Helper function to generate call COGS generation as of a specific date
# which updates remaining quantities for ManufactureResult and Returns as of that date
def re_rank_manufacture_orders_use_before_generate_manufacture_results_as_of_date():
    # Create temporary table for ranking
    db.session.execute(text("""
        CREATE TEMPORARY TABLE RankedRows AS
        SELECT
            id,
            dense_rank() OVER (
                ORDER BY manufacture_date, SKU
            ) AS new_manufacture_order_id
        FROM manufactureorders;
    """))

    # Update manufacture order IDs
    db.session.execute(text("""
        UPDATE manufactureorders
        SET manufacture_order_id = (
            SELECT new_manufacture_order_id
            FROM RankedRows
            WHERE manufactureorders.id = RankedRows.id
        );
    """))

    # Drop temporary table
    db.session.execute(text("DROP TABLE IF EXISTS RankedRows;"))

def generate_cogs_as_of_date(target_date):
    # Reset quantities
    # Manufacture Result Reset must be handled outside before use of this function
    db.session.execute(text("""
        UPDATE returns
        SET quantity_left = return_quantity;
    """))

    db.session.execute(text("""
                UPDATE stockinitiationaddition
                SET quantity_left = fulfilled_quantity;
            """))

    # Clear existing COGS
    db.session.execute(text("DELETE FROM cogs;"))
    db.session.execute(text("DELETE FROM failedcogs;"))

    # Get all sales records up to target date
    sales_records = db.session.execute(text("""
        SELECT sales_record_id, SKU, quantity_sold, sales_date
        FROM salesrecords
        WHERE sales_date <= CAST(:target_date AS DATE)
        ORDER BY sales_date;
    """), {'target_date': target_date}).fetchall()

    # Process each sales record
    for sales_record_id, SKU, quantity_sold, sales_date in sales_records:

        # First check if there's any available inventory
        total_available = db.session.execute(text("""
            WITH manufacture_qty AS (
                SELECT 
                    manufacture_order_id,
                    manufacture_batch,
                    manufacture_completion_date,
                    COALESCE(min(quantity_left), 0) as qty
                FROM manufactureresult 
                WHERE SKU = :SKU 
                AND manufacture_completion_date <= CAST(:sales_date AS DATE) 
                AND quantity_left > 0
                GROUP BY manufacture_order_id, manufacture_batch, manufacture_completion_date
            ),
            all_qty AS (
                SELECT COALESCE(sum(quantity_left), 0) as qty
                FROM returns
                WHERE SKU = :SKU 
                AND return_date <= CAST(:sales_date AS DATE) 
                AND quantity_left > 0
                
                UNION ALL
                
                SELECT COALESCE(sum(qty), 0) as qty
                FROM manufacture_qty
                
                UNION ALL
                
                SELECT COALESCE(sum(quantity_left), 0) as qty
                FROM stockinitiationaddition
                WHERE SKU = :SKU 
                AND manufacture_completion_date <= CAST(:sales_date AS DATE) 
                AND quantity_left > 0
            )
            SELECT COALESCE(sum(qty), 0) as total_qty
            FROM all_qty;
        """), {'SKU': SKU, 'sales_date': sales_date}).scalar()

        # If no inventory available, record as failed immediately
        if total_available == 0:
            db.session.execute(text("""
                INSERT INTO FailedCOGS (
                    sales_record_id, sales_date, SKU, quantity_sold,
                    failed_quantity, failure_reason
                ) VALUES (
                    :sales_record_id, :sales_date, :SKU, :quantity_sold,
                    :quantity_sold, 'No available inventory'
                );
            """), {
                'sales_record_id': sales_record_id,
                'sales_date': sales_date,
                'SKU': SKU,
                'quantity_sold': quantity_sold
            })
            continue

        remaining_qty = quantity_sold
        cogs_updates = []

        # Get available inventory
        available_inventory = db.session.execute(text("""
            WITH available_inventory AS (
                SELECT 
                    'return' as source,
                    0 as manufacture_order_id,
                    0 as manufacture_batch,
                    return_date as completion_date,
                    return_order_id as source_id,
                    quantity_left,
                    return_unit_price*fx_rate as unit_cost
                FROM returns
                WHERE SKU = :SKU 
                AND return_date <= CAST(:sales_date AS DATE) 
                AND quantity_left > 0
                
                UNION ALL
                
                SELECT 
                    'manufacture' as source,
                    manufacture_order_id,
                    manufacture_batch,
                    manufacture_completion_date as completion_date,
                    cast(manufacture_order_id as text) as source_id,
                        COALESCE(min(quantity_left), 0) as quantity_left,
                        COALESCE(sum(unit_cost), 0) as unit_cost
                FROM manufactureresult
                WHERE SKU = :SKU 
                AND manufacture_completion_date <= CAST(:sales_date AS DATE) 
                AND quantity_left > 0
                GROUP BY source, manufacture_order_id, manufacture_batch, 
                            completion_date
                UNION ALL
                
                SELECT 
                    'initiation' as source,
                    result_id as manufacture_order_id,
                    manufacture_batch,
                    manufacture_completion_date as completion_date,
                    cast(result_id as text) as source_id,
                        COALESCE(sum(quantity_left), 0) as quantity_left,
                        COALESCE(sum(unit_cost), 0) as unit_cost
                FROM stockinitiationaddition
                WHERE SKU = :SKU 
                AND manufacture_completion_date <= CAST(:sales_date AS DATE) 
                AND quantity_left > 0
                    GROUP BY source, manufacture_order_id, manufacture_batch, 
                            completion_date
            )
            SELECT * FROM available_inventory
            ORDER BY completion_date;
        """), {'SKU': SKU, 'sales_date': sales_date}).fetchall()

        for source, order_id, batch, completion_date, source_id, available_qty, unit_cost in available_inventory:
            if remaining_qty == 0:
                break

            allocated_qty = min(remaining_qty, available_qty)
            remaining_qty -= allocated_qty
            
            if source == 'return':
                # For returns, we don't need product ratios
                cogs_updates.append({
                    'sales_record_id': sales_record_id,
                    'manufacture_order_id': 0,
                    'manufacture_batch': 0,
                    'SKU': SKU,
                    'product': SKU,
                    'fulfilled_by_PO': source_id,
                    'consumed_quantity': allocated_qty,
                    'cost': allocated_qty * float(unit_cost),
                    'sales_date': sales_date
                })
            elif source == 'initiation':
                # For stock initiation, we don't need product ratios
                cogs_updates.append({
                    'sales_record_id': sales_record_id,
                    'manufacture_order_id': -1,
                    'manufacture_batch': -1,
                    'SKU': SKU,
                    'product': SKU,
                    'fulfilled_by_PO': 'INITIATION & ADDITION ' + source_id,
                    'consumed_quantity': allocated_qty,
                    'cost': allocated_qty * float(unit_cost),
                    'sales_date': sales_date
                })
            else:
                # Get product ratios for manufacture orders
                product_ratios,_ = calculate_product_ratios_COGS(order_id, batch, completion_date)
                
                # Get all products used in this batch
                batch_products = db.session.execute(text("""
                    SELECT product, fulfilled_by_PO, unit_cost
                    FROM manufactureresult
                    WHERE manufacture_order_id = :order_id 
                    AND manufacture_batch = :batch;
                """), {'order_id': order_id, 'batch': batch}).fetchall()

                for product, po_id, product_unit_cost in batch_products:
                    ratio = product_ratios[product]
                    consumed_qty = allocated_qty * ratio
                    
                    cogs_updates.append({
                        'sales_record_id': sales_record_id,
                        'manufacture_order_id': order_id,
                        'manufacture_batch': batch,
                        'SKU': SKU,
                        'product': product,
                        'fulfilled_by_PO': po_id,
                        'consumed_quantity': consumed_qty,
                        'cost': consumed_qty * float(product_unit_cost),
                        'sales_date': sales_date
                    })

        # Insert successful COGS records
        for update in cogs_updates:
            db.session.execute(text("""
                INSERT INTO COGS (
                    sales_record_id, sales_date, SKU, quantity_sold,
                    result_id, manufacture_batch, product, fulfilled_by_PO,
                    COGS
                ) VALUES (
                    :sales_record_id, :sales_date, :SKU, :consumed_quantity,
                    :manufacture_order_id, :manufacture_batch, :product, :fulfilled_by_PO,
                    :cost
                );
            """), update)

            if update.get('manufacture_order_id') == 0:  # Return source
                db.session.execute(text("""
                    UPDATE returns
                    SET quantity_left = quantity_left - :consumed_quantity
                    WHERE return_order_id = :fulfilled_by_PO AND SKU = :SKU;
                """), update)
            elif update.get('manufacture_order_id') == -1:  # Stock Initiation source
                result_id_int = int(update['fulfilled_by_PO'].replace('INITIATION & ADDITION ', ''))
                db.session.execute(text("""
                    UPDATE stockinitiationaddition
                    SET quantity_left = quantity_left - :consumed_quantity
                    WHERE result_id = :result_id AND SKU = :SKU;
                """), {
                    **update,
                    'result_id': result_id_int
                })
            else:  # Manufacture source
                db.session.execute(text("""
                    UPDATE manufactureresult
                    SET quantity_left = quantity_left - :consumed_quantity
                    WHERE manufacture_order_id = :manufacture_order_id
                    AND manufacture_batch = :manufacture_batch
                    AND SKU = :SKU
                    AND product = :product
                    AND fulfilled_by_PO = :fulfilled_by_PO;
                """), update)

        # Record failed portion if any
        if remaining_qty > 0:
            db.session.execute(text("""
                INSERT INTO FailedCOGS (
                    sales_record_id, sales_date, SKU, quantity_sold,
                    failed_quantity, failure_reason
                ) VALUES (
                    :sales_record_id, :sales_date, :SKU, :quantity_sold,
                    :remaining_qty, 'Insufficient stock to fulfill order'
                );
            """), {
                'sales_record_id': sales_record_id,
                'sales_date': sales_date,
                'SKU': SKU,
                'quantity_sold': quantity_sold,
                'remaining_qty': remaining_qty
            })
    
def generate_manufacture_results_as_of_date(target_date):
    try:
        with db.session.begin():
            # Reset PO quantities
            db.session.execute(text("UPDATE purchaseorders SET quantity_left = purchase_quantity;"))

            # Clear previous results
            db.session.execute(text("DELETE FROM cogs;"))
            db.session.execute(text("DELETE FROM failedcogs;"))
            db.session.execute(text("DELETE FROM manufactureresult;"))
            db.session.execute(text("DELETE FROM failedmanufactureresult;"))

            # Get manufacture orders as of target_date
            order_ids = db.session.execute(text("""
                SELECT DISTINCT manufacture_order_id
                FROM manufactureorders
                WHERE manufacture_date <= CAST(:target_date AS DATE)
                ORDER BY manufacture_order_id;
            """), {'target_date': target_date}).fetchall()

            for (order_id,) in order_ids:
                staged_updates = []

                # Step 1: Get required product quantities
                needed_products = db.session.execute(text("""
                    SELECT SKU, product, manufacture_quantity, manufacture_date
                    FROM manufactureorders
                    WHERE manufacture_order_id = :order_id
                    ORDER BY product;
                """), {'order_id': order_id}).fetchall()

                if not needed_products:
                    continue

                # Step 2: Compute product ratios and required SKU count
                product_ratios, _ = calculate_product_ratios(order_id)
                product_qtys = []
                for _, product, qty, _ in needed_products:
                    product_qtys.append((product, qty))
                try:
                    required_skus = min(qty // product_ratios[product] for product, qty in product_qtys)
                except ZeroDivisionError:
                    required_skus = 0

                # Step 3: Prepare raw PO pool (no allocation yet)
                for SKU, product, _, manufacture_date in needed_products:
                    if isinstance(manufacture_date, str):
                        manufacture_date = datetime.strptime(manufacture_date, '%Y-%m-%d').date()

                    purchase_orders = db.session.execute(text("""
                        SELECT purchase_order_id, quantity_left, purchase_unit_price, fx_rate, order_date
                        FROM purchaseorders
                        WHERE product = :product
                        AND quantity_left > 0
                        AND (order_date - INTERVAL '5 days') <= :manufacture_date
                        ORDER BY order_date;
                    """), {'product': product, 'manufacture_date': manufacture_date}).fetchall()

                    for po_id, quantity_left, unit_price, fx_rate, order_date in purchase_orders:
                        if isinstance(order_date, str):
                            order_date = datetime.strptime(order_date, '%Y-%m-%d').date()

                        staged_updates.append({
                            'order_id': order_id,
                            'SKU': SKU,
                            'product': product,
                            'po_id': po_id,
                            'allocated_qty': quantity_left,
                            'unit_price': float(unit_price) * float(fx_rate),
                            'fx_rate': float(fx_rate),
                            'cost': quantity_left * float(unit_price) * float(fx_rate),
                            'completion_date': manufacture_date,
                            'order_date': order_date
                        })

                # Step 4: Attempt batching
                processed_updates = process_manufacture_batches(order_id, staged_updates, required_skus)

                if processed_updates:
                    for update in processed_updates:
                        db.session.execute(text("""
                            INSERT INTO manufactureresult (
                                manufacture_order_id, manufacture_batch, SKU, product, fulfilled_by_PO,
                                fulfilled_quantity, cost, unit_cost, manufacture_completion_date, status, quantity_left
                            ) VALUES (
                                :order_id, :manufacture_batch, :SKU, :product, :po_id,
                                :allocated_qty, :cost, :unit_price, :completion_date, 'COMPLETED', :allocated_qty
                            )
                        """), update)

                        db.session.execute(text("""
                            UPDATE purchaseorders
                            SET quantity_left = quantity_left - :allocated_qty
                            WHERE purchase_order_id = :po_id AND product = :product;
                        """), update)
                else:
                    for SKU, product, _, manufacture_date in needed_products:
                        if isinstance(manufacture_date, datetime):
                            manufacture_date = manufacture_date.strftime('%Y-%m-%d')
                        db.session.execute(text("""
                            INSERT INTO failedmanufactureresult (
                                manufacture_order_id, SKU, product, manufacture_date, failure_reason
                            ) VALUES (
                                :order_id, :SKU, :product, :manufacture_date, 'Insufficient stock to fulfill order'
                            )
                        """), {
                            'order_id': order_id,
                            'SKU': SKU,
                            'product': product,
                            'manufacture_date': manufacture_date
                        })

    except Exception as e:
        db.session.rollback()
        print(f"Error in generate_manufacture_results_as_of_date: {str(e)}")

def update_manufacture_results_with_stock_exchange_as_of_date(target_date):
    # Clear all failed stock exchanges
    db.session.execute(text("""
        DELETE FROM failedstockexchange;
    """))

    # Get all stock exchanges
    stock_exchanges = db.session.execute(text("""
        SELECT id, SKU_original, SKU_new, quantity, exchange_date
        FROM stockexchange
        WHERE exchange_date <= CAST(:target_date AS DATE)
        ORDER BY exchange_date;
    """), {'target_date': target_date}).fetchall()

    mo_number = -2
    for exchange_id, sku_original, sku_new, exchange_quantity, exchange_date in stock_exchanges:
        remaining_qty = exchange_quantity
        staged_updates = []

        # Get all manufacture results for the original SKU
        manufacture_results = db.session.execute(text("""
            SELECT 
                manufacture_order_id,
                manufacture_batch,
                SKU,
                product,
                fulfilled_by_PO,
                fulfilled_quantity,
                cost,
                unit_cost,
                manufacture_completion_date,
                status,
                quantity_left
            FROM manufactureresult
            WHERE SKU = :sku AND quantity_left > 0 AND manufacture_completion_date <= CAST(:exchange_date AS DATE)
            ORDER BY manufacture_completion_date DESC, manufacture_batch DESC, manufacture_order_id DESC;
        """), {
            'sku': sku_original,
            'exchange_date': exchange_date
        }).fetchall()

        # Check if any manufacture results are available
        if not manufacture_results:
            # Store failed exchange in FailedStockExchange table
            db.session.execute(text("""
                INSERT INTO FailedStockExchange (
                    SKU_original, SKU_new, quantity, exchange_date
                ) VALUES (:sku_original, :sku_new, :quantity, :exchange_date);
            """), {
                'sku_original': sku_original,
                'sku_new': sku_new,
                'quantity': exchange_quantity,
                'exchange_date': exchange_date
            })
            print(f"Failed to process exchange ID {exchange_id}. "
                    f"No available stock found for SKU {sku_original}")
            continue

        # Group results by MO ID and batch
        grouped_results = {}
        for result in manufacture_results:
            mo_id, batch = result[0], result[1]
            key = (mo_id, batch)
            if key not in grouped_results:
                grouped_results[key] = []
            grouped_results[key].append(result)

        # Process each group and create staged updates
        batch_number = 1
        exchange_fulfilled = False
        
        for (mo_id, batch), group in grouped_results.items():
            if remaining_qty <= 0:
                exchange_fulfilled = True
                break

            # Calculate product ratios for this manufacture order
            product_ratios, min_quantity = calculate_product_ratios(mo_id)
            
            # Find how much we can consume from this group
            min_available = float('inf')
            for result in group:
                product = result[3]
                quantity = int(result[5])
                if product in product_ratios:
                    possible_skus = quantity // product_ratios[product]
                    min_available = min(min_available, possible_skus)

            # Calculate how much to consume
            to_consume = min(remaining_qty, min_available)
            if to_consume <= 0:
                continue

            # Create staged updates for each product in the group
            for result in group:
                mo_id = result[0]
                batch = result[1]
                product = result[3]
                po_id = result[4]
                current_cost = result[6]
                unit_cost = result[7]

                if product in product_ratios:
                    consume_qty = to_consume * product_ratios[product]

                    # Stage update for existing record
                    staged_updates.append({
                        "type": "update",
                        "mo_id": mo_id,
                        "batch": batch,
                        "product": product,
                        "po_id": po_id,
                        "consume_qty": consume_qty,
                        "new_cost": current_cost - consume_qty * unit_cost
                    })

                    # Stage insert for new record
                    staged_updates.append({
                        "type": "insert",
                        "mo_id": mo_number,
                        "batch": batch_number,
                        "sku": sku_new,
                        "product": product,
                        "po_id": po_id,
                        "quantity": consume_qty,
                        "cost": consume_qty * unit_cost,
                        "unit_cost": unit_cost,
                        "completion_date": exchange_date
                    })

            remaining_qty -= to_consume
            batch_number = batch_number + 1
        mo_number = mo_number -1

        # Only process updates if the exchange can be fully fulfilled
        if remaining_qty <= 0:
            # Process all staged updates
            for update in staged_updates:
                if update["type"] == "update":
                    db.session.execute(text("""
                        UPDATE manufactureresult
                        SET fulfilled_quantity = fulfilled_quantity - :consume_qty,
                            quantity_left = quantity_left - :consume_qty,
                            cost = :new_cost
                        WHERE manufacture_order_id = :mo_id 
                            AND manufacture_batch = :batch
                            AND product = :product
                            AND fulfilled_by_PO = :po_id;
                    """), update)
                else:  # insert
                    db.session.execute(text("""
                        INSERT INTO manufactureresult (
                            manufacture_order_id, manufacture_batch, SKU, product,
                            fulfilled_by_PO, fulfilled_quantity, cost, unit_cost,
                            manufacture_completion_date, status, quantity_left
                        ) VALUES (
                            :mo_id, :batch, :sku, :product,
                            :po_id, :quantity, :cost, :unit_cost,
                            :completion_date, 'COMPLETED', :quantity
                        );
                    """), update)
            print(f"Successfully processed exchange ID {exchange_id}")
        else:
            # Store failed exchange in FailedStockExchange table
            db.session.execute(text("""
                INSERT INTO FailedStockExchange (
                    SKU_original, SKU_new, quantity, exchange_date
                ) VALUES (:sku_original, :sku_new, :quantity, :exchange_date);
            """), {
                'sku_original': sku_original,
                'sku_new': sku_new,
                'quantity': exchange_quantity,
                'exchange_date': exchange_date
            })

@app.route('/inventory/generate', methods=['GET'])
def generate_inventory():
    try:
        target_date = request.args.get('date', None)

        # If date is provided, validate its format
        if target_date:
            try:
                datetime.strptime(target_date, '%Y-%m-%d')
            except ValueError:
                return jsonify({'error': 'Invalid date format. Please format date as YYYY-MM-DD'}), 400

        with db.session.begin():
            if target_date is None:
                # Find the latest date from all relevant tables
                result = db.session.execute(text("""
                    SELECT MAX(latest_date) 
                    FROM (
                        SELECT MAX(sales_date) as latest_date FROM salesrecords
                        UNION ALL
                        SELECT MAX(return_date) as latest_date FROM returns
                        UNION ALL
                        SELECT MAX(manufacture_completion_date) as latest_date FROM stockinitiationaddition
                        UNION ALL
                        SELECT MAX(manufacture_completion_date) as latest_date FROM manufactureresult
                        UNION ALL
                        SELECT MAX(exchange_date) as latest_date FROM stockexchange
                    );
                """)).scalar()
                target_date = result

            if not target_date:
                return jsonify({'error': 'No records found to determine inventory date'}), 404

            # Generate Manufacture Result, Update with Exchange, then Generate COGS as of target date
            re_rank_manufacture_orders_use_before_generate_manufacture_results_as_of_date()
            generate_manufacture_results_as_of_date(target_date)
            update_manufacture_results_with_stock_exchange_as_of_date(target_date)
            generate_cogs_as_of_date(target_date)

            # Now proceed with inventory calculation
            db.session.execute(text("""
                DELETE FROM inventory
                WHERE as_of_date = CAST(:target_date AS DATE);
            """), {'target_date': target_date})

            # Insert new inventory records
            db.session.execute(text("""
                INSERT INTO Inventory (SKU, as_of_date, manufactured_total_quantity, in_stock_quantity, inventory_value)
                WITH 
                initiated AS (
                    SELECT 
                        SKU,
                        -1 as manufacture_order_id,
                        -1 as manufacture_batch,
                        sum(fulfilled_quantity) as manufactured_total,
                        sum(quantity_left) as manufactured_stock,
                        sum(unit_cost * quantity_left) as inventory_value
                    FROM stockinitiationaddition
                    WHERE manufacture_completion_date <= CAST(:target_date AS DATE)
                    GROUP BY SKU, manufacture_order_id, manufacture_batch
                ),
                manufactured AS (
                    SELECT 
                        SKU,
                        manufacture_order_id,
                        manufacture_batch,
                        min(fulfilled_quantity) as manufactured_total,
                        min(quantity_left) as manufactured_stock,
                        sum(unit_cost * quantity_left) as inventory_value
                    FROM manufactureresult
                    WHERE manufacture_completion_date <= CAST(:target_date AS DATE)
                    GROUP BY SKU, manufacture_order_id, manufacture_batch
                ),
                returned AS (
                    SELECT 
                        SKU,
                        0 as manufacture_order_id,
                        0 as manufacture_batch,
                        sum(return_quantity) as returns_total,
                        sum(quantity_left) as returns_stock,
                        sum(return_unit_price * quantity_left) as inventory_value
                    FROM returns
                    WHERE return_date <= CAST(:target_date AS DATE)
                    GROUP BY SKU, manufacture_order_id, manufacture_batch
                ),
                combine AS (
                    SELECT 
                        SKU,
                        CAST(:target_date AS DATE) as as_of_date,
                        sum(manufactured_total) as manufactured_total_quantity,
                        sum(manufactured_stock) as in_stock_quantity,
                        sum(inventory_value) as inventory_value
                    FROM initiated 
                    GROUP BY SKU, as_of_date
                    UNION ALL
                    SELECT 
                        SKU,
                        CAST(:target_date AS DATE) as as_of_date,
                        sum(manufactured_total) as manufactured_total_quantity,
                        sum(manufactured_stock) as in_stock_quantity,
                        sum(inventory_value) as inventory_value
                    FROM manufactured 
                    GROUP BY SKU, as_of_date
                    UNION ALL
                    SELECT 
                        SKU,
                        CAST(:target_date AS DATE) as as_of_date,
                        sum(returns_total) as manufactured_total_quantity,
                        sum(returns_stock) as in_stock_quantity,
                        sum(inventory_value) as inventory_value
                    FROM returned
                    GROUP BY SKU, as_of_date
                )
                SELECT
                    SKU,
                    as_of_date,
                    sum(manufactured_total_quantity) as manufactured_total_quantity,
                    sum(in_stock_quantity) as in_stock_quantity,
                    sum(inventory_value) as inventory_value
                FROM combine
                GROUP BY SKU, as_of_date
            """), {'target_date': target_date})

        return jsonify({
            'message': f'Inventory generated successfully as of {target_date}'
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500
        
@app.route('/inventory_raw_material/generate', methods=['GET'])
def generate_inventory_raw_material():
    try:
        target_date = request.args.get('date', None)

        # If date is provided, validate its format
        if target_date:
            try:
                datetime.strptime(target_date, '%Y-%m-%d')
            except ValueError:
                return jsonify({'error': 'Invalid date format. Please format date as YYYY-MM-DD'}), 400

        with db.session.begin():
            if target_date is None:
                # Find the latest date from all relevant tables
                result = db.session.execute(text("""
                    SELECT MAX(latest_date) 
                    FROM (
                        SELECT MAX(sales_date) as latest_date FROM salesrecords
                        UNION ALL
                        SELECT MAX(manufacture_completion_date) FROM stockinitiationaddition
                        UNION ALL
                        SELECT MAX(manufacture_completion_date) FROM manufactureresult
                        UNION ALL
                        SELECT MAX(return_date) FROM returns
                        UNION ALL
                        SELECT MAX(order_date) FROM purchaseorders
                    );
                """)).scalar()
                target_date = result

            if not target_date:
                return jsonify({'error': 'No records found to determine inventory date'}), 404

            # Generate manufacture and exchange stock as of target date
            re_rank_manufacture_orders_use_before_generate_manufacture_results_as_of_date()
            generate_manufacture_results_as_of_date(target_date)
            update_manufacture_results_with_stock_exchange_as_of_date(target_date)

            # Now proceed with inventory calculation
            db.session.execute(text("""
                DELETE FROM inventoryRawMaterial
                WHERE as_of_date = CAST(:target_date AS DATE);
            """), {'target_date': target_date})

            # Insert new inventory records
            db.session.execute(text("""
                INSERT INTO InventoryRawMaterial (Product, as_of_date, purchased_total_quantity, in_stock_quantity, inventory_value)
                SELECT
                    product,
                    CAST(:target_date AS DATE) as as_of_date,
                    sum(purchase_quantity) as purchased_total_quantity,
                    sum(quantity_left) as in_stock_quantity,
                    sum(total_cost / purchase_quantity * quantity_left) as inventory_value
                FROM purchaseorders
                WHERE order_date <= CAST(:target_date AS DATE)
                GROUP BY product
            """), {'target_date': target_date})

        return jsonify({
            'message': f'Inventory for purchased raw material generated successfully as of {target_date}'
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500


# ---------------------------------------------------------------------------------------------------------------
# Statement Decomposition Table                                                                                  |
# ---------------------------------------------------------------------------------------------------------------
@app.route('/quickbooks/statement-decomp', methods=['POST'])
def process_statement_decomp():
    """
    Online deployment version - processes files in memory without local storage
    """
    try:
        from backend.processing.functions.memory_file_processor import MemoryFileProcessor
            
        # Get files from request
        deposit_statement = request.files.get('deposit_statement')
        order_data_files = request.files.getlist('order_data')
        
        if not deposit_statement or not order_data_files:
            return jsonify({'error': 'Missing required files'}), 400
            
        # Create memory processor and load files
        memory_processor = MemoryFileProcessor()
        
        # Add deposit statement
        memory_processor.add_file_from_upload('deposit_statement', deposit_statement)
        
        # Add order data files
        for i, file in enumerate(order_data_files):
            memory_processor.add_file_from_upload(f'order_data_{i}', file)
            
        # Process the files using memory-based function
        from backend.processing.functions.statement_decomp_table_memory import statement_decomp_table_memory
        html_table = statement_decomp_table_memory(memory_processor)
        
        # Clear memory processor
        memory_processor.clear_files()
        
        soup = BeautifulSoup(html_table, 'html.parser')
        table = soup.find('table')
        
        headers = []
        for th in table.find_all('th'):
            headers.append(th.text.strip())
            
        rows = []
        for tr in table.find_all('tr')[1:]:  # Skip header row
            row = []
            for td in tr.find_all('td'):
                row.append(td.text.strip())
            if row:  # Only append non-empty rows
                rows.append(row)
            
        return jsonify({
            "status": "success",
            "table": {
                "headers": headers,
                "rows": rows
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ---------------------------------------------------------------------------------------------------------------
# Month-End Booking                                                                                             |
# ---------------------------------------------------------------------------------------------------------------
# Create upload directory constant
quickbooks_amazon_proceeds_booking_upload_dir = os.path.join(project_root, "quickbooks", "uploads")
os.makedirs(quickbooks_amazon_proceeds_booking_upload_dir, exist_ok=True)
@app.route('/quickbooks/month-end-booking', methods=['POST'])
def process_month_end_booking():
    """
    Online deployment version - processes files in memory without local storage
    """
    try:
        from backend.processing.functions.memory_file_processor import MemoryFileProcessor
        from backend.processing.api.journal_entries_api_booking.in_order_month_deposit_journal_online import create_in_order_month_journal_entry
            
        # Get files from request
        order_data = request.files.get('order_data')
        sku_economics_files = request.files.getlist('sku_economics')
        inbound_shipping = request.files.get('inbound_shipping')
        deposited_statements = request.files.getlist('deposited_statements')

        # Validate required files
        if not all([order_data, sku_economics_files, inbound_shipping, deposited_statements]):
            return jsonify({'error': 'Missing required files'}), 400
            
        # Create memory processor and load files
        memory_processor = MemoryFileProcessor()
        
        # Add files with auto-detection (handles CSV, TXT, Excel automatically)
        memory_processor.add_file_from_upload('order_data', order_data)
        
        # Add SKU economics files
        for i, file in enumerate(sku_economics_files):
            memory_processor.add_file_from_upload(f'sku_economics_{i}', file)
            
        # Add inbound shipping file
        memory_processor.add_file_from_upload('inbound_shipping', inbound_shipping)
        
        # Add deposited statements (auto-detects TXT, CSV, etc.)
        for i, file in enumerate(deposited_statements):
            memory_processor.add_file_from_upload(f'statements_{i}', file)

        # Process the journal entry creation directly in memory
        result = create_in_order_month_journal_entry(memory_processor)
        
        # Clear memory processor
        memory_processor.clear_files()
        
        if result.get("success"):
            return jsonify({
                "status": "success",
                    "message": "Journal entry created successfully in QuickBooks",
                    "data": result.get("data")
                })
        else:
            return jsonify({
                "status": "error", 
                "error": result.get("error"),
                "details": result.get("details")
            }), 500
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/quickbooks/post-month-end-booking', methods=['POST'])
def process_post_month_end_booking():
    """
    Online deployment version - processes files in memory without local storage
    """
    try:
        from backend.processing.functions.memory_file_processor import MemoryFileProcessor
        from backend.processing.api.journal_entries_api_booking.out_of_order_month_deposit_journal_online import create_out_of_order_month_journal_entry
            
        # Get files from request
        order_data = request.files.get('order_data')
        sku_economics_files = request.files.getlist('sku_economics')
        inbound_shipping = request.files.get('inbound_shipping')
        deposited_statements = request.files.getlist('deposited_statements')
        new_deposited_statement = request.files.get('new_deposited_statement')

        # Validate required files
        if not all([order_data, sku_economics_files, inbound_shipping, deposited_statements, new_deposited_statement]):
            return jsonify({'error': 'Missing required files'}), 400
            
        # Create memory processor and load files
        memory_processor = MemoryFileProcessor()
        
        # Add files with auto-detection (handles CSV, TXT, Excel automatically)
        memory_processor.add_file_from_upload('order_data', order_data)
        
        # Add SKU economics files
        for i, file in enumerate(sku_economics_files):
            memory_processor.add_file_from_upload(f'sku_economics_{i}', file)
            
        # Add inbound shipping file
        memory_processor.add_file_from_upload('inbound_shipping', inbound_shipping)
        
        # Add deposited statements (auto-detects TXT, CSV, etc.)
        for i, file in enumerate(deposited_statements):
            memory_processor.add_file_from_upload(f'statements_{i}', file)

        # Add new deposited statement
        memory_processor.add_file_from_upload('statements_new', new_deposited_statement)

        # Process the journal entry creation directly in memory
        result = create_out_of_order_month_journal_entry(memory_processor)
        
        # Clear memory processor
        memory_processor.clear_files()
        
        if result.get("success"):
            return jsonify({
                "status": "success",
                    "message": "Post month-end journal entries created successfully in QuickBooks",
                    "data": result.get("data")
                })
        else:
            return jsonify({
                "status": "error", 
                "error": result.get("error"),
                "details": result.get("details")
            }), 500
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
# ---------------------------------------------------------------------------------------------------------------
# COGS Booking                                                                                                   |
# ---------------------------------------------------------------------------------------------------------------
# Yield the sum
@app.route('/api/cogs/calculate', methods=['POST'])
def calculate_cogs():
    try:
        # Get date range from request
        data = request.get_json()
        booking_date_start = data.get('booking_date_start')
        booking_date_end = data.get('booking_date_end')
        
        # Validate required parameters
        if not booking_date_start or not booking_date_end:
            return jsonify({'error': 'Missing required parameters: booking_date_start and booking_date_end'}), 400
            
        # Calculate total COGS amount for the date range
        cogs_result = db.session.execute(text("""
            SELECT COALESCE(SUM(COGS), 0) as total_cogs
            FROM cogs
            WHERE sales_date >= CAST(:booking_date_start AS DATE)
            AND sales_date <= CAST(:booking_date_end AS DATE)
        """), {
            'booking_date_start': booking_date_start,
            'booking_date_end': booking_date_end
        }).scalar()
        
        # Convert to float to ensure it's a proper number
        cogs_amount = float(cogs_result)
        
        return jsonify({
            "amount": cogs_amount,
            "period": f"{booking_date_start} to {booking_date_end}"
        })
        
    except Exception as e:
        print(f"Error in calculate_cogs: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Book COGS to QuickBooks
@app.route('/quickbooks/book-cogs', methods=['POST'])
def book_cogs_to_quickbooks():
    try:
        # Get date range from request
        data = request.get_json()
        booking_date_start = data.get('booking_date_start')
        booking_date_end = data.get('booking_date_end')
        
        # Validate required parameters
        if not booking_date_start or not booking_date_end:
            return jsonify({'error': 'Missing required parameters: booking_date_start and booking_date_end'}), 400
            
        # Calculate total COGS amount for the date range
        cogs_result = db.session.execute(text("""
            SELECT COALESCE(SUM(COGS), 0) as total_cogs
            FROM cogs
            WHERE sales_date >= CAST(:booking_date_start AS DATE)
            AND sales_date <= CAST(:booking_date_end AS DATE)
        """), {
            'booking_date_start': booking_date_start,
            'booking_date_end': booking_date_end
        }).scalar()
        
        # Convert to float to ensure it's a proper number
        cogs_amount = float(cogs_result)
        
        # Get tokens directly from .env file
        env_path = os.path.join(project_root, 'backend', 'processing', 'api', '.env')
        config = dotenv_values(env_path)
        access_token = config.get('ACCESS_TOKEN')
        realm_id = config.get('REALM_ID')
        
        if not realm_id:
            return jsonify({'error': 'QuickBooks realm_id is not configured'}), 500
        
        # Create a temporary script in a directory that Flask is NOT watching
        # Use a system temp directory instead of project directory
        import tempfile
        import time
        temp_dir = tempfile.gettempdir()
        temp_script_path = os.path.join(temp_dir, f"cogs_booking_{int(time.time())}.py")
        
        with open(temp_script_path, 'w') as f:
            f.write(f"""
import os
import sys

# Use absolute path to project root
project_root = "{project_root.replace('\\', '\\\\')}"
sys.path.append(project_root)

from backend.processing.api.journal_entries_api_booking.COGS_journal import create_COGS_journal_entry
from dotenv import dotenv_values

# Call the function with our parameters
result = create_COGS_journal_entry(
    access_token="{access_token}",
    realm_id="{realm_id}",
    COGS_amount={cogs_amount},
    booking_date_start="{booking_date_start}",
    booking_date_end="{booking_date_end}"
)

print("COGS journal entry created successfully")
""")
        
        # Set up environment with correct Python path
        env = os.environ.copy()
        if 'PYTHONPATH' in env:
            env['PYTHONPATH'] = f"{project_root};{env['PYTHONPATH']}"
        else:
            env['PYTHONPATH'] = project_root
            
        # Execute the temporary script
        result = subprocess.run(
            [sys.executable, temp_script_path], 
            capture_output=True, 
            text=True,
            env=env,
            cwd=project_root  # Set the working directory to project root
        )
        
        # Clean up the temporary script
        if os.path.exists(temp_script_path):
            os.remove(temp_script_path)
        
        if result.returncode != 0:
            raise Exception(f"COGS journal entry creation failed: {result.stderr}")
            
        return jsonify({
            "status": "success",
            "message": "COGS journal entry created successfully in QuickBooks",
            "amount": cogs_amount,
            "period": f"{booking_date_start} to {booking_date_end}"
        })
        
    except Exception as e:
        print(f"Error in book_cogs_to_quickbooks: {str(e)}")
        # Clean up the temporary script in case of error
        if 'temp_script_path' in locals() and os.path.exists(temp_script_path):
            os.remove(temp_script_path)
        return jsonify({'error': str(e)}), 500


# ---------------------------------------------------------------------------------------------------------------
# Frontend Cards Metrics                                                                                         |
# ---------------------------------------------------------------------------------------------------------------
@app.route('/purchase_orders/latest', methods=['GET'])
def get_latest_purchase_order():
    """
    Get the latest purchase order with total cost
    Returns the purchase order with the most recent order date
    """
    query = """
    SELECT po.purchase_order_id, po.order_date, s.name as supplier_name, 
           SUM(po.total_cost) as total_cost
        FROM purchaseorders po
    LEFT JOIN Suppliers s ON po.supplier_id = s.supplier_id
    GROUP BY po.purchase_order_id, po.order_date, s.name
    ORDER BY po.order_date DESC, po.purchase_order_id DESC
    LIMIT 1
    """
    
    result = db.session.execute(text(query)).fetchone()
    
    if not result:
        return jsonify({'error': 'No purchase orders found'}), 404
    
    # Convert result to dictionary
    latest_po = {
        'purchase_order_id': result[0],
        'order_date': result[1] if result[1] else None,
        'supplier_name': result[2],
        'total_cost': str(result[3]) if result[3] else '0'
    }
    
    return jsonify(latest_po)

@app.route('/manufacture_orders/latest', methods=['GET'])
def get_latest_manufacture_order():
    """
    Get the latest manufacture order
    Returns the manufacture order with the most recent manufacture date
    """
    try:
        count_query = "SELECT COUNT(*) FROM manufactureorders"
        count_result = db.session.execute(text(count_query)).fetchone()
        if not count_result or count_result[0] == 0:
            print("No manufacture orders found in database")
            return jsonify({'error': 'No manufacture orders found'}), 404
        
        query = """
                SELECT mo.sku, mo.manufacture_date, mo.manufacture_quantity
                FROM manufactureorders mo
        ORDER BY mo.manufacture_date DESC, mo.manufacture_order_id DESC
        LIMIT 1
        """
        result = db.session.execute(text(query)).fetchone()
        
        if not result:
            return jsonify({'error': 'No manufacture orders found'}), 404
        
        # Convert result to dictionary
        latest_mo = {
                        'sku': result[0],
                        'manufacture_date': result[1].isoformat() if result[1] else None,
            'manufacture_quantity': str(result[2]) if result[2] else '0'
        }
        
        return jsonify(latest_mo)
        
    except Exception as e:
        print(f"Error in get_latest_manufacture_order: {str(e)}")
        return jsonify({'error': f'Database error: {str(e)}'}), 500

@app.route('/manufacture_orders/status/check', methods=['GET'])
def check_manufacture_order_status():
    """
    Check if all products from PurchaseOrders appear in ManufactureOrders
    """
    # Query to find products that appear in PurchaseOrders but not in ManufactureOrders
    query = """
    select distinct product
    from purchaseorders
    where product not in (select distinct product from manufactureorders)
    """
    
    result = db.session.execute(text(query)).fetchall()
    
    # Convert result to a list of product names
    missing_products = [row[0] for row in result] if result else []
    
    # Prepare the response
    status = {
        'all_products_planned': len(missing_products) == 0,
        'missing_products': missing_products
    }
    
    return jsonify(status)

@app.route('/stock_initiation_addition/latest', methods=['GET'])
def get_latest_stock_addition():
    """
    Get the latest stock addition record
    Returns the stock addition with the most recent manufacture completion date
    """
    query = """
    SELECT SKU, manufacture_completion_date, fulfilled_quantity, cost
    FROM stockinitiationaddition
    ORDER BY manufacture_completion_date DESC, result_id DESC, SKU DESC
    LIMIT 1
    """
    
    result = db.session.execute(text(query)).fetchone()
    
    if not result:
        return jsonify({'error': 'No stock addition records found'}), 404
    
    # Convert result to dictionary
    latest_addition = {
        'SKU': result[0],
        'manufacture_completion_date': result[1] if result[1] else None,
        'fulfilled_quantity': str(result[2]) if result[2] else '0',
        'cost': str(result[3]) if result[3] else '0'
    }
    
    return jsonify(latest_addition)

@app.route('/stock_exchange/latest', methods=['GET'])
def get_latest_stock_exchange():
    """
    Get the latest stock exchange record
    Returns the stock exchange with the most recent exchange date
    """
    query = """
    SELECT SKU_original, SKU_new, quantity, exchange_date
    FROM stockexchange
    ORDER BY exchange_date DESC, id DESC, SKU_new DESC
    LIMIT 1
    """
    
    result = db.session.execute(text(query)).fetchone()
    
    if not result:
        return jsonify({'error': 'No stock exchange records found'}), 404
    
    # Convert result to dictionary
    latest_exchange = {
        'SKU_original': result[0],
        'SKU_new': result[1],
        'quantity': str(result[2]) if result[2] else '0',
        'exchange_date': result[3] if result[3] else None
    }
    
    return jsonify(latest_exchange)

@app.route('/sales_records/latest', methods=['GET'])
def get_latest_sales_record():
    """
    Get the latest sales record
    Returns the sales record with the most recent sales date
    """
    query = """
    select sales_record_id, SKU, sales_date, name
    from SalesRecords s
    left join Customers c
    on s.customer_id = c.customer_id
    order by sales_date DESC, name ASC, sales_record_id DESC, SKU DESC
    limit 1
    """
    
    result = db.session.execute(text(query)).fetchone()
    
    if not result:
        return jsonify({'error': 'No sales records found'}), 404
    
    # Convert result to dictionary
    latest_sales = {
        'sales_record_id': result[0],
        'SKU': result[1],
        'sales_date': result[2] if result[2] else None,
        'customer_name': result[3] if result[3] else None
    }
    
    return jsonify(latest_sales)

@app.route('/returns/latest', methods=['GET'])
def get_latest_return():
    """
    Get the latest return record
    Returns the return record with the most recent return date
    """
    query = """
    select return_order_id, SKU, return_date, name
    from Returns r
    left join Suppliers s
    on r.supplier_id = s.supplier_id
    order by return_date DESC, name ASC, return_order_id DESC, SKU DESC
    limit 1
    """
    
    result = db.session.execute(text(query)).fetchone()
    
    if not result:
        return jsonify({'error': 'No returns found'}), 404
    
    # Convert result to dictionary
    latest_return = {
        'return_order_id': result[0],
        'SKU': result[1],
        'return_date': result[2] if result[2] else None,
        'supplier_name': result[3]
    }
    
    return jsonify(latest_return)

@app.route('/manufacture_result/latest', methods=['GET'])
def get_latest_manufacture_result():
    """
    Get the latest manufacture result
    Returns the manufacture result with the most recent completion date
    """
    query = """
    with interim1 as (
    select manufacture_order_id, SKU, manufacture_completion_date
    from ManufactureResult
    order by manufacture_completion_date DESC, manufacture_order_id DESC, manufacture_batch DESC
    limit 1
    ),
    interim2 as (
    select manufacture_order_id, manufacture_batch, SKU, manufacture_completion_date, min(fulfilled_quantity) as quantity
    from ManufactureResult
    where manufacture_order_id in (select manufacture_order_id from interim1)
    and SKU in (select SKU from interim1)
    and manufacture_completion_date in (select manufacture_completion_date from interim1)
    group by manufacture_order_id, manufacture_batch, SKU, manufacture_completion_date
    )
    select manufacture_order_id, SKU, manufacture_completion_date, sum(quantity) as quantity
    from interim2
    group by manufacture_order_id, SKU, manufacture_completion_date
    """
    
    result = db.session.execute(text(query)).fetchone()
    
    if not result:
        return jsonify({'error': 'No manufacture results found'}), 404
    
    # Convert result to dictionary
    latest_result = {
        'manufacture_order_id': result[0],
        'SKU': result[1],
        'manufacture_completion_date': result[2] if result[2] else None,
        'quantity': str(result[3]) if result[3] else '0'
    }
    
    return jsonify(latest_result)

@app.route('/manufacture_result/status/check', methods=['GET'])
def check_manufacture_result_status():
    """
    Check if cost for all manufacture orders and stock exchange for all 
    exchange requests have been generated
    """
    # Check if cost for all manufacture orders generated
    mo_query = """
    select manufacture_order_id 
    from ManufactureOrders
    where manufacture_order_id not in (select manufacture_order_id from ManufactureResult)
    and manufacture_order_id not in (select manufacture_order_id from FailedManufactureResult)
    """
    
    mo_result = db.session.execute(text(mo_query)).fetchone()
    
    # Check if stock exchange for all exchange requests generated
    se_query = """
    with successful_stock_exchange as (
    select s.*
    from StockExchange s
    left join FailedStockExchange f
    on s.SKU_original = f.SKU_original and s.SKU_new = f.SKU_new and s.exchange_date = f.exchange_date
    and f.id is null
    )
    
    select SKU
    from successful_stock_exchange as s
    left join ManufactureResult as m
    on m.manufacture_completion_date = s.exchange_date and m.SKU = s.SKU_new and m.manufacture_order_id <= -2
    where m.manufacture_order_id is null
    """
    
    se_result = db.session.execute(text(se_query)).fetchone()
    
    # Prepare the response
    status = {
        'all_manufacture_costs_generated': mo_result is None,
        'all_stock_exchange_generated': se_result is None
    }
    
    return jsonify(status)

@app.route('/cogs/latest', methods=['GET'])
def get_latest_cogs():
    """
    Get the latest COGS record
    Returns the COGS record with the most recent sales date
    """
    query = """
    with interim1 as (
    select sales_date, sales_record_id, SKU
    from COGS
    order by sales_date DESC, sales_record_id DESC, SKU DESC
    limit 1
    ),

    interim2 as (
    select distinct sales_record_id, name
    from SalesRecords s
    left join Customers c
    on s.customer_id = c.customer_id
    where sales_record_id in (select sales_record_id from interim1)
    )

    select sales_date, COGS.sales_record_id, name, SKU, sum(COGS)
    from COGS
    left join interim2
    on COGS.sales_record_id = interim2.sales_record_id
    where sales_date = (select sales_date from interim1)
    and COGS.sales_record_id = (select sales_record_id from interim1)
    and SKU = (select SKU from interim1)
    group by sales_date, COGS.sales_record_id, name, SKU
    """
    
    result = db.session.execute(text(query)).fetchone()
    
    if not result:
        return jsonify({'error': 'No COGS records found'}), 404
    
    # Convert result to dictionary
    latest_cogs = {
        'sales_date': result[0] if result[0] else None,
        'sales_record_id': result[1] if result[1] else None,
        'customer_name': result[2] if result[2] else None,
        'SKU': result[3] if result[3] else None,
        'cogs_value': str(result[4]) if result[4] else '0'
    }
    
    return jsonify(latest_cogs)

@app.route('/cogs/status/check', methods=['GET'])
def check_cogs_status():
    """
    Check if COGS have been generated for all sales records
    """
    query = """
    select distinct sales_record_id
    from SalesRecords
    where sales_record_id not in (select distinct sales_record_id from COGS)
    and sales_record_id not in (select distinct sales_record_id from FailedCOGS)
    """
    
    result = db.session.execute(text(query)).fetchone()
    
    # Prepare the response
    status = {
        'all_cogs_generated': result is None
    }
    
    return jsonify(status)





