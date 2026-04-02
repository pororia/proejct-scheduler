"""Customer CRUD API router."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Customer, Project
from backend.schemas import CustomerCreate, CustomerUpdate, CustomerResponse

router = APIRouter(prefix="/api/customers", tags=["customers"])


@router.get("", response_model=list[CustomerResponse])
def list_customers(db: Session = Depends(get_db)):
    return db.query(Customer).order_by(Customer.name).all()


@router.post("", response_model=CustomerResponse, status_code=201)
def create_customer(data: CustomerCreate, db: Session = Depends(get_db)):
    if db.query(Customer).filter(Customer.name == data.name).first():
        raise HTTPException(400, "Customer already exists")
    customer = Customer(name=data.name)
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(customer_id: int, data: CustomerUpdate, db: Session = Depends(get_db)):
    customer = db.query(Customer).get(customer_id)
    if not customer:
        raise HTTPException(404, "Customer not found")
    customer.name = data.name
    db.commit()
    db.refresh(customer)
    return customer


@router.delete("/{customer_id}")
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(Customer).get(customer_id)
    if not customer:
        raise HTTPException(404, "Customer not found")
    # Block delete if projects exist
    if db.query(Project).filter(Project.customer_id == customer_id).count() > 0:
        raise HTTPException(400, "Cannot delete customer with existing projects")
    db.delete(customer)
    db.commit()
    return {"ok": True}
