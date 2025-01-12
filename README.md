# El7a2ny-Backend

## Database Schema

The following ERD (Entity Relationship Diagram) represents the structure of the database:

```mermaid
erDiagram
    USERS ||--o{ USER_VEHICLES : "owns"
    USERS ||--o{ SERVICE_REQUESTS : "creates"
    USERS {
        string firebase_uid PK
        string email UK
        string phone
        string profile_pic
        string gender
        string type
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    VEHICLES ||--o{ USER_VEHICLES : "linked"
    VEHICLES {
        uuid id PK
        string make
        string model
        int year
        boolean turbo
        boolean exotic
        string car_type
        timestamp created_at
        timestamp updated_at
    }

    USER_VEHICLES {
        string user_id FK
        uuid vehicle_id FK
        string license_plate
        timestamp created_at
        timestamp updated_at
    }

    SERVICE_CENTERS ||--o{ SERVICE_REQUESTS : "provides"
    SERVICE_CENTERS {
        string firebase_uid PK
        string email UK
        string name
        string address
        point location
        string phone
        string profile_pic
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    SERVICE_CENTERS ||--o{ SERVICE_CENTER_BRANCHES : "has"
    SERVICE_CENTER_BRANCHES {
        uuid id PK
        string parent_center_id FK
        string branch_center_id FK
        timestamp created_at
        timestamp updated_at
    }

    SERVICE_TYPES ||--o{ SERVICE_CENTER_SPECIALTIES : "specializes"
    SERVICE_CENTER_SPECIALTIES {
        string center_id FK
        uuid service_type_id FK
    }

    SERVICE_TYPES ||--o{ WORKSHOP_SERVICES : "defines"
    SERVICE_TYPES {
        uuid id PK
        string service_category
        string name
        string description
        timestamp created_at
        timestamp updated_at
    }

    SERVICE_CENTERS ||--o{ WORKSHOP_SERVICES : "offers"
    WORKSHOP_SERVICES {
        uuid id PK
        string workshop_id FK
        uuid service_type_id FK
        interval estimated_duration
        decimal average_cost
        timestamp created_at
        timestamp updated_at
    }

    SERVICE_REQUESTS ||--o{ EMERGENCY_SERVICES : "may_have"
    SERVICE_REQUESTS {
        uuid id PK
        string user_id FK
        uuid vehicle_id FK
        string service_center_id FK
        uuid service_type_id FK
        string status
        string priority
        timestamp requested_at
        timestamp scheduled_at
        timestamp completed_at
        timestamp created_at
        timestamp updated_at
    }

    EMERGENCY_SERVICES {
        uuid id PK
        uuid service_request_id FK
        decimal latitude
        decimal longitude
        string status
        timestamp estimated_arrival_time
        timestamp created_at
        timestamp updated_at
    }

    BLOCKED_ENTITIES {
        uuid id PK
        string service_center_id FK
        string user_id FK
        string blocked_by
        string reason
        timestamp created_at
        timestamp updated_at
    }

    REVIEWS {
        uuid id PK
        uuid service_request_id FK
        timestamp created_at
        timestamp updated_at
    }
```


































# Start of Backend Documentation



Naming convention for branches and commits:
Branches: start with feat or fix for example
feat/EL7-1-creation-of-navbar
commits:
feat or fix too
feat(navbar): main navbar for dashboard
