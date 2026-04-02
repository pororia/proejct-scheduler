"""Initial data seeding script based on Excel data."""
import sys
import os
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import init_db, SessionLocal
from backend.models import (
    Customer, Project, ProjectTechStack,
    Member, MemberSkill, Assignment, MonthlyAllocation
)


def seed():
    init_db()
    db = SessionLocal()

    # Check if already seeded
    if db.query(Customer).count() > 0:
        print("Database already seeded. Skipping.")
        db.close()
        return

    # --- Customers ---
    customer_names = [
        "수자원공사", "드림시스", "삼성전자", "신세계아이앤씨", "OK데이터 시스템",
        "인천공항공사", "GC녹십자", "스마일게이트", "LG엔솔", "우즈베키스탄",
        "LG전자", "LG CNS", "서부발전", "동양생명", "㈜LG",
        "토스뱅크", "미래에셋증권", "외교부", "상공회의소", "KT Cloud",
        "서울대학교", "기상청", "한국도로공사", "중소기업벤처진흥공단", "베트남",
        "몽골", "삼성전자 리서치", "KB국민은행", "하나투어", "동아대학교",
        "삼성카드", "SK하이닉스", "HL홀딩스", "현대제철", "대원CTS",
        "KBS", "티맥스클라우드", "LG이노텍"
    ]
    customers = {}
    for name in customer_names:
        c = Customer(name=name)
        db.add(c)
        db.flush()
        customers[name] = c.id

    # --- Members ---
    member_data = [
        ("김호진", "특급", 15), ("이건웅", "고급", 10), ("이동원", "고급", 9),
        ("이진덕", "고급", 12), ("정광근", "고급", 11), ("이광철", "고급", 8),
        ("변진영", "고급", 9), ("강주희", "중급", 5), ("최수빈", "중급", 4),
        ("지민용", "초급", 2), ("조철진", "고급", 10), ("김태현", "중급", 6),
        ("정진이", "중급", 5), ("윤지윤", "중급", 4), ("임기환", "고급", 8),
        ("정광필", "고급", 11), ("신호철", "고급", 13), ("김봉수", "고급", 10),
        ("최주신", "중급", 5), ("박경민", "고급", 7), ("신재성", "고급", 9),
        ("김태현B", "중급", 6),
    ]
    members = {}
    for name, grade, yoe in member_data:
        m = Member(name=name, grade=grade, years_of_experience=yoe)
        db.add(m)
        db.flush()
        members[name] = m.id

    # Member skills
    member_skills = {
        "김호진": ["OpenStack", "Kubernetes", "DevOps"],
        "이건웅": ["Kubernetes", "CI/CD", "DevOps"],
        "이동원": ["OpenStack", "Kubernetes"],
        "이진덕": ["OpenStack", "인프라"],
        "정광근": ["Kubernetes", "DevOps", "CI/CD"],
        "이광철": ["OpenStack", "Ceph"],
        "변진영": ["Kubernetes", "Containerize"],
        "강주희": ["Kubernetes", "DevOps"],
        "최수빈": ["Kubernetes", "CI/CD"],
        "지민용": ["OpenStack", "Linux OS"],
        "조철진": ["Kubernetes", "NKP"],
        "김태현": ["OpenStack", "Linux OS"],
        "정진이": ["Kubernetes", "Containerize"],
        "윤지윤": ["CI/CD", "DevOps"],
        "임기환": ["Kubernetes", "DevOps"],
        "정광필": ["OpenStack", "인프라"],
        "신호철": ["OpenStack", "Kubernetes", "인프라"],
        "김봉수": ["Kubernetes", "DevOps", "CI/CD"],
        "최주신": ["OpenStack", "Linux OS"],
        "박경민": ["Kubernetes", "NKP"],
        "신재성": ["OpenStack", "Kubernetes"],
        "김태현B": ["Kubernetes", "Containerize"],
    }
    for mname, skills in member_skills.items():
        for skill in skills:
            db.add(MemberSkill(member_id=members[mname], tech_stack=skill))

    # --- Sample Projects & Assignments ---
    sample_projects = [
        {
            "customer": "수자원공사", "name": "수자원공사 인프라 구축",
            "start": date(2025, 6, 1), "end": date(2025, 12, 31),
            "ptype": "프로젝트", "btype": "컨설팅 및 구축", "budget": 2.0,
            "confirmed": "O", "status": "진행중",
            "tech": ["OpenStack", "CI/CD"],
            "assigns": [
                ("신호철", date(2025, 6, 1), date(2025, 12, 1), 2.0, "OpenStack", "PL"),
                ("이진덕", date(2025, 6, 1), date(2025, 12, 1), 2.0, "OpenStack", "구축인력"),
                ("지민용", date(2025, 1, 1), date(2025, 12, 31), 12.0, "OpenStack", "상주인력"),
            ],
        },
        {
            "customer": "드림시스", "name": "드림시스 장비센서 K8S",
            "start": date(2025, 5, 1), "end": date(2025, 7, 31),
            "ptype": "프로젝트", "btype": "구축", "budget": 1.5,
            "confirmed": "O", "status": "진행중",
            "tech": ["Kubernetes"],
            "assigns": [
                ("이건웅", date(2025, 5, 1), date(2025, 7, 31), 3.0, "Kubernetes", "PL"),
                ("강주희", date(2025, 5, 1), date(2025, 7, 31), 3.0, "Kubernetes", "구축인력"),
            ],
        },
        {
            "customer": "삼성전자", "name": "삼성전자 DevOps 구축",
            "start": date(2025, 4, 1), "end": date(2025, 9, 30),
            "ptype": "프로젝트", "btype": "신규구축", "budget": 5.0,
            "confirmed": "O", "status": "진행중",
            "tech": ["Kubernetes", "DevOps", "CI/CD"],
            "assigns": [
                ("김호진", date(2025, 4, 1), date(2025, 9, 30), 6.0, "DevOps", "PM"),
                ("정광근", date(2025, 4, 1), date(2025, 9, 30), 6.0, "Kubernetes", "PL"),
                ("윤지윤", date(2025, 5, 1), date(2025, 9, 30), 5.0, "CI/CD", "구축인력"),
            ],
        },
        {
            "customer": "인천공항공사", "name": "인천공항 로봇관제 K8S",
            "start": date(2025, 6, 1), "end": date(2025, 8, 31),
            "ptype": "프로젝트", "btype": "구축", "budget": 1.0,
            "confirmed": "O", "status": "진행중",
            "tech": ["Kubernetes"],
            "assigns": [
                ("이건웅", date(2025, 7, 1), date(2025, 8, 31), 1.0, "Kubernetes", "PL"),
                ("최수빈", date(2025, 6, 1), date(2025, 8, 31), 3.0, "Kubernetes", "구축인력"),
            ],
        },
        {
            "customer": "GC녹십자", "name": "GC녹십자 클라우드 전환",
            "start": date(2025, 7, 1), "end": date(2025, 12, 31),
            "ptype": "프로젝트", "btype": "마이그레이션", "budget": 3.0,
            "confirmed": "O", "status": "시작전",
            "tech": ["OpenStack", "Kubernetes"],
            "assigns": [
                ("이동원", date(2025, 7, 1), date(2025, 12, 31), 6.0, "OpenStack", "PL"),
                ("이광철", date(2025, 7, 1), date(2025, 12, 31), 6.0, "Ceph", "구축인력"),
            ],
        },
        {
            "customer": "LG엔솔", "name": "LG엔솔 컨테이너 플랫폼",
            "start": date(2025, 5, 1), "end": date(2025, 8, 31),
            "ptype": "프로젝트", "btype": "구축", "budget": 2.5,
            "confirmed": "O", "status": "진행중",
            "tech": ["Kubernetes", "Containerize"],
            "assigns": [
                ("변진영", date(2025, 5, 1), date(2025, 7, 31), 3.0, "Kubernetes", "PL"),
                ("정진이", date(2025, 5, 1), date(2025, 8, 31), 4.0, "Containerize", "구축인력"),
            ],
        },
        {
            "customer": "동양생명", "name": "동양생명 K8S 업그레이드",
            "start": date(2025, 7, 1), "end": date(2025, 9, 30),
            "ptype": "프로젝트", "btype": "업그레이드", "budget": 1.0,
            "confirmed": "O", "status": "시작전",
            "tech": ["Kubernetes"],
            "assigns": [
                ("변진영", date(2025, 8, 1), date(2025, 9, 30), 2.0, "Kubernetes", "PL"),
            ],
        },
        {
            "customer": "우즈베키스탄", "name": "우즈베키스탄 컨테이너/CICD",
            "start": date(2025, 10, 1), "end": date(2025, 11, 30),
            "ptype": "프로젝트", "btype": "구축", "budget": 2.0,
            "confirmed": "?", "status": "미정",
            "tech": ["Kubernetes", "CI/CD"],
            "assigns": [
                ("이건웅", date(2025, 10, 1), date(2025, 10, 31), 1.0, "Kubernetes", "PL"),
                ("김봉수", date(2025, 10, 1), date(2025, 11, 30), 2.0, "CI/CD", "구축인력"),
            ],
        },
        {
            "customer": "토스뱅크", "name": "토스뱅크 OpenStack PoC",
            "start": date(2025, 8, 1), "end": date(2025, 9, 30),
            "ptype": "PoC", "btype": "컨설팅", "budget": 0.5,
            "confirmed": "?", "status": "미정",
            "tech": ["OpenStack"],
            "assigns": [
                ("신재성", date(2025, 8, 1), date(2025, 9, 30), 1.0, "OpenStack", "컨설턴트"),
            ],
        },
        {
            "customer": "KB국민은행", "name": "KB국민은행 유지보수",
            "start": date(2025, 1, 1), "end": date(2025, 12, 31),
            "ptype": "유지보수", "btype": "상주 유지보수", "budget": 3.0,
            "confirmed": "O", "status": "진행중",
            "tech": ["OpenStack", "Kubernetes"],
            "assigns": [
                ("조철진", date(2025, 1, 1), date(2025, 12, 31), 12.0, "Kubernetes", "상주인력"),
                ("김태현", date(2025, 1, 1), date(2025, 12, 31), 12.0, "OpenStack", "상주인력"),
            ],
        },
        {
            "customer": "하나투어", "name": "하나투어 유지보수",
            "start": date(2025, 1, 1), "end": date(2025, 12, 31),
            "ptype": "유지보수", "btype": "유지보수", "budget": 1.0,
            "confirmed": "O", "status": "진행중",
            "tech": ["Kubernetes"],
            "assigns": [
                ("임기환", date(2025, 1, 1), date(2025, 12, 31), 6.0, "Kubernetes", "유지보수"),
            ],
        },
        {
            "customer": "SK하이닉스", "name": "SK하이닉스 NKP 구축",
            "start": date(2025, 9, 1), "end": date(2026, 2, 28),
            "ptype": "프로젝트", "btype": "구축", "budget": 4.0,
            "confirmed": "?", "status": "미정",
            "tech": ["NKP", "Kubernetes"],
            "assigns": [
                ("박경민", date(2025, 9, 1), date(2026, 2, 28), 6.0, "NKP", "PL"),
                ("김태현B", date(2025, 10, 1), date(2026, 2, 28), 5.0, "Kubernetes", "구축인력"),
            ],
        },
        {
            "customer": "LG전자", "name": "LG전자 DevOps 고도화",
            "start": date(2025, 8, 1), "end": date(2025, 12, 31),
            "ptype": "프로젝트", "btype": "고도화", "budget": 3.0,
            "confirmed": "O", "status": "시작전",
            "tech": ["DevOps", "CI/CD"],
            "assigns": [
                ("김봉수", date(2025, 8, 1), date(2025, 12, 31), 5.0, "DevOps", "PL"),
                ("최주신", date(2025, 8, 1), date(2025, 12, 31), 5.0, "CI/CD", "구축인력"),
            ],
        },
        {
            "customer": "현대제철", "name": "현대제철 Harvester PoC",
            "start": date(2025, 11, 1), "end": date(2025, 12, 31),
            "ptype": "PoC", "btype": "컨설팅", "budget": 0.5,
            "confirmed": "?", "status": "미정",
            "tech": ["Harvester"],
            "assigns": [
                ("정광필", date(2025, 11, 1), date(2025, 12, 31), 2.0, "Harvester", "컨설턴트"),
            ],
        },
        {
            "customer": "서부발전", "name": "서부발전 Linux OS 전환",
            "start": date(2025, 9, 1), "end": date(2026, 3, 31),
            "ptype": "프로젝트", "btype": "마이그레이션", "budget": 2.0,
            "confirmed": "O", "status": "시작전",
            "tech": ["Linux OS"],
            "assigns": [
                ("정광필", date(2025, 9, 1), date(2025, 10, 31), 2.0, "Linux OS", "PL"),
            ],
        },
    ]

    for sp in sample_projects:
        p = Project(
            customer_id=customers[sp["customer"]],
            name=sp["name"],
            start_date=sp["start"],
            end_date=sp["end"],
            project_type=sp["ptype"],
            business_type=sp["btype"],
            budget=sp["budget"],
            confirmed=sp["confirmed"],
            status=sp["status"],
        )
        db.add(p)
        db.flush()

        for ts in sp["tech"]:
            db.add(ProjectTechStack(project_id=p.id, tech_stack=ts))

        for a_data in sp["assigns"]:
            mname, a_start, a_end, mm, tech, role = a_data
            a = Assignment(
                project_id=p.id,
                member_id=members[mname],
                start_date=a_start,
                end_date=a_end,
                man_month=mm,
                tech_stack=tech,
                role_description=role,
                grade_required=None,
            )
            db.add(a)
            db.flush()

            # Auto-generate monthly allocations
            cy, cm = a_start.year, a_start.month
            while (cy < a_end.year) or (cy == a_end.year and cm <= a_end.month):
                db.add(MonthlyAllocation(
                    assignment_id=a.id, year=cy, month=cm, allocation=1.0
                ))
                cm += 1
                if cm > 12:
                    cm = 1
                    cy += 1

    db.commit()
    db.close()
    print(f"Seeded {len(customer_names)} customers, {len(member_data)} members, {len(sample_projects)} projects.")


if __name__ == "__main__":
    seed()
