"""SQLAlchemy ORM models."""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, Text, Float, DateTime, Date,
    ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import relationship
from backend.database import Base


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(Text, nullable=False, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    projects = relationship("Project", back_populates="customer", cascade="all, delete-orphan")


class SalesRep(Base):
    __tablename__ = "sales_reps"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(Text, nullable=False)
    division_team = Column(Text, nullable=True)  # 사업부>팀명
    created_at = Column(DateTime, default=datetime.utcnow)

    projects = relationship("Project", back_populates="sales_rep_obj")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, autoincrement=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False)
    name = Column(Text, nullable=False)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    project_type = Column(Text, default="프로젝트")
    business_type = Column(Text, nullable=True)
    status = Column(Text, default="미정")
    budget = Column(Float, nullable=True)
    confirmed = Column(Text, default="미정")
    notes = Column(Text, nullable=True)
    project_url = Column(Text, nullable=True)   # 프로젝트 상세 URL
    document_url = Column(Text, nullable=True)  # 프로젝트 문서 URL
    description = Column(Text, nullable=True)   # HTML 설명
    sales_rep = Column(Text, nullable=True)       # 담당 영업 (레거시 텍스트)
    sales_rep_id = Column(Integer, ForeignKey("sales_reps.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = relationship("Customer", back_populates="projects")
    tech_stacks = relationship("ProjectTechStack", back_populates="project", cascade="all, delete-orphan")
    assignments = relationship("Assignment", back_populates="project", cascade="all, delete-orphan")
    recurring_schedules = relationship("RecurringSchedule", back_populates="project", cascade="all, delete-orphan")
    sales_rep_obj = relationship("SalesRep", back_populates="projects")


class ProjectTechStack(Base):
    __tablename__ = "project_tech_stacks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    tech_stack = Column(Text, nullable=False)

    project = relationship("Project", back_populates="tech_stacks")


class Member(Base):
    __tablename__ = "members"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(Text, nullable=False)
    division = Column(Text, nullable=True)
    team = Column(Text, nullable=True)
    years_of_experience = Column(Integer, nullable=True)
    grade = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    skills = relationship("MemberSkill", back_populates="member", cascade="all, delete-orphan")
    assignments = relationship("Assignment", back_populates="member", cascade="all, delete-orphan")


class MemberSkill(Base):
    __tablename__ = "member_skills"

    id = Column(Integer, primary_key=True, autoincrement=True)
    member_id = Column(Integer, ForeignKey("members.id", ondelete="CASCADE"), nullable=False)
    tech_stack = Column(Text, nullable=False)

    member = relationship("Member", back_populates="skills")


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    member_id = Column(Integer, ForeignKey("members.id", ondelete="CASCADE"), nullable=False)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    man_month = Column(Float, nullable=True)
    role_description = Column(Text, nullable=True)
    tech_stack = Column(Text, nullable=True)
    grade_required = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="assignments")
    member = relationship("Member", back_populates="assignments")
    monthly_allocations = relationship("MonthlyAllocation", back_populates="assignment", cascade="all, delete-orphan")
    periods = relationship("AssignmentPeriod", back_populates="assignment", cascade="all, delete-orphan", order_by="AssignmentPeriod.start_date")


class AssignmentPeriod(Base):
    __tablename__ = "assignment_periods"

    id = Column(Integer, primary_key=True, autoincrement=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    man_month = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    assignment = relationship("Assignment", back_populates="periods")


class MonthlyAllocation(Base):
    __tablename__ = "monthly_allocations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    allocation = Column(Float, default=1.0)

    assignment = relationship("Assignment", back_populates="monthly_allocations")

    __table_args__ = (
        UniqueConstraint("assignment_id", "year", "month", name="uq_allocation_period"),
    )


class RecurringSchedule(Base):
    __tablename__ = "recurring_schedules"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    recurrence_type = Column(Text, nullable=False)  # "monthly" | "quarterly"
    day_of_month = Column(Integer, nullable=False)   # 1-31
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="recurring_schedules")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(Text, unique=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    name = Column(Text, nullable=False)
    division = Column(Text, nullable=True)
    team = Column(Text, nullable=True)
    role = Column(Text, default="user")  # admin, manager, user
    created_at = Column(DateTime, default=datetime.utcnow)


class MasterData(Base):
    __tablename__ = "master_data"

    id = Column(Integer, primary_key=True, autoincrement=True)
    category = Column(Text, nullable=False)
    value = Column(Text, nullable=False)

    __table_args__ = (
        UniqueConstraint("category", "value", name="uq_master_data"),
    )


class ReleaseNote(Base):
    __tablename__ = "release_notes"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    version    = Column(Text, nullable=False)   # "v0.5"
    title      = Column(Text, nullable=True)    # "기능 개선 및 버그 수정"
    content    = Column(Text, nullable=True)    # HTML
    released_at = Column(Text, nullable=True)   # "YYYY-MM-DD"
    created_at = Column(DateTime, default=datetime.utcnow)
