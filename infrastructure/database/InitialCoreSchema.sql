CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;

CREATE TABLE departments (
    id uuid NOT NULL,
    name character varying(100) NOT NULL,
    description character varying(500),
    is_active boolean NOT NULL,
    created_at_utc timestamp with time zone NOT NULL,
    updated_at_utc timestamp with time zone,
    CONSTRAINT "PK_departments" PRIMARY KEY (id)
);

CREATE TABLE work_locations (
    id uuid NOT NULL,
    name character varying(150) NOT NULL,
    address character varying(300) NOT NULL,
    latitude numeric(9,6),
    longitude numeric(9,6),
    allowed_radius_metres integer NOT NULL,
    is_active boolean NOT NULL,
    created_at_utc timestamp with time zone NOT NULL,
    updated_at_utc timestamp with time zone,
    CONSTRAINT "PK_work_locations" PRIMARY KEY (id),
    CONSTRAINT ck_work_locations_latitude CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
    CONSTRAINT ck_work_locations_longitude CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180)),
    CONSTRAINT ck_work_locations_radius_positive CHECK (allowed_radius_metres > 0)
);

CREATE TABLE employees (
    id uuid NOT NULL,
    employee_number character varying(30) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    email character varying(255),
    phone_number character varying(30),
    department_id uuid NOT NULL,
    work_location_id uuid NOT NULL,
    is_active boolean NOT NULL,
    created_at_utc timestamp with time zone NOT NULL,
    updated_at_utc timestamp with time zone,
    CONSTRAINT "PK_employees" PRIMARY KEY (id),
    CONSTRAINT "FK_employees_departments_department_id" FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE RESTRICT,
    CONSTRAINT "FK_employees_work_locations_work_location_id" FOREIGN KEY (work_location_id) REFERENCES work_locations (id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX ux_departments_name ON departments (name);

CREATE INDEX ix_employees_department_id ON employees (department_id);

CREATE INDEX ix_employees_work_location_id ON employees (work_location_id);

CREATE UNIQUE INDEX ux_employees_email ON employees (email);

CREATE UNIQUE INDEX ux_employees_employee_number ON employees (employee_number);

CREATE UNIQUE INDEX ux_work_locations_name ON work_locations (name);

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260728120055_InitialCoreSchema', '8.0.28');

COMMIT;

