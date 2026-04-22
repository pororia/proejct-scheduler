"""Pydantic schemas for request/response validation."""
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel


# --- Customer ---
class CustomerBase(BaseModel):
    name: str

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(CustomerBase):
    pass

class CustomerResponse(CustomerBase):
    id: int
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True


# --- Project Tech Stack ---
class TechStackItem(BaseModel):
    tech_stack: str

class TechStackResponse(TechStackItem):
    id: int
    class Config:
        from_attributes = True


# --- Assignment ---
class AssignmentBase(BaseModel):
    member_id: int
    start_date: date
    end_date: date
    man_month: Optional[float] = None
    role_description: Optional[str] = None
    tech_stack: Optional[str] = None
    grade_required: Optional[str] = None
    notes: Optional[str] = None

class AssignmentCreate(AssignmentBase):
    pass

class AssignmentUpdate(BaseModel):
    member_id: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    man_month: Optional[float] = None
    role_description: Optional[str] = None
    tech_stack: Optional[str] = None
    grade_required: Optional[str] = None
    notes: Optional[str] = None

class AssignmentResponse(AssignmentBase):
    id: int
    project_id: int
    member_name: Optional[str] = None
    project_name: Optional[str] = None
    customer_name: Optional[str] = None
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True


# --- Monthly Allocation ---
class MonthlyAllocationBase(BaseModel):
    year: int
    month: int
    allocation: float = 1.0

class MonthlyAllocationCreate(MonthlyAllocationBase):
    assignment_id: int

class MonthlyAllocationResponse(MonthlyAllocationBase):
    id: int
    assignment_id: int
    class Config:
        from_attributes = True


# --- Member Skill ---
class MemberSkillItem(BaseModel):
    tech_stack: str

class MemberSkillResponse(MemberSkillItem):
    id: int
    class Config:
        from_attributes = True


# --- Member ---
class MemberBase(BaseModel):
    name: str
    division: Optional[str] = None
    team: Optional[str] = None
    years_of_experience: Optional[int] = None
    grade: Optional[str] = None

class MemberCreate(MemberBase):
    skills: list[str] = []

class MemberUpdate(BaseModel):
    name: Optional[str] = None
    division: Optional[str] = None
    team: Optional[str] = None
    years_of_experience: Optional[int] = None
    grade: Optional[str] = None
    skills: Optional[list[str]] = None

class MemberResponse(MemberBase):
    id: int
    skills: list[MemberSkillResponse] = []
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class MemberDetailResponse(MemberResponse):
    assignments: list[AssignmentResponse] = []


# --- Sales Rep ---
class SalesRepBase(BaseModel):
    name: str
    division_team: Optional[str] = None

class SalesRepCreate(SalesRepBase):
    pass

class SalesRepUpdate(BaseModel):
    name: Optional[str] = None
    division_team: Optional[str] = None

class SalesRepResponse(SalesRepBase):
    id: int
    assigned_customers: list[str] = []
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True


# --- Project ---
class ProjectBase(BaseModel):
    customer_id: int
    name: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    project_type: Optional[str] = "프로젝트"
    business_type: Optional[str] = None
    status: Optional[str] = "미정"
    budget: Optional[float] = None
    confirmed: Optional[str] = "미정"
    notes: Optional[str] = None
    project_url: Optional[str] = None
    document_url: Optional[str] = None
    description: Optional[str] = None
    sales_rep: Optional[str] = None
    sales_rep_id: Optional[int] = None

class ProjectCreate(ProjectBase):
    tech_stacks: list[str] = []

class ProjectUpdate(BaseModel):
    customer_id: Optional[int] = None
    name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    project_type: Optional[str] = None
    business_type: Optional[str] = None
    status: Optional[str] = None
    budget: Optional[float] = None
    confirmed: Optional[str] = None
    notes: Optional[str] = None
    project_url: Optional[str] = None
    document_url: Optional[str] = None
    description: Optional[str] = None
    sales_rep: Optional[str] = None
    sales_rep_id: Optional[int] = None
    tech_stacks: Optional[list[str]] = None

class ProjectResponse(ProjectBase):
    id: int
    customer_name: Optional[str] = None
    tech_stacks: list[TechStackResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class ProjectDetailResponse(ProjectResponse):
    assignments: list[AssignmentResponse] = []
