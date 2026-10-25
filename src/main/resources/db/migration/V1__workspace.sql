CREATE TABLE app_users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE spaces (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE memberships (
    space_id VARCHAR(36) NOT NULL REFERENCES spaces(id),
    user_id VARCHAR(36) NOT NULL REFERENCES app_users(id),
    role VARCHAR(16) NOT NULL CHECK (role IN ('OWNER','ADMIN','MEMBER','VIEWER')),
    PRIMARY KEY (space_id, user_id)
);
CREATE TABLE projects (
    id VARCHAR(36) PRIMARY KEY,
    space_id VARCHAR(36) NOT NULL REFERENCES spaces(id),
    name VARCHAR(120) NOT NULL,
    description TEXT NOT NULL,
    goal TEXT NOT NULL,
    color VARCHAR(16) NOT NULL,
    status VARCHAR(16) NOT NULL CHECK (status IN ('ACTIVE','PAUSED','ARCHIVED')),
    website VARCHAR(500) NOT NULL,
    github_repository VARCHAR(200) NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id, space_id)
);
CREATE TABLE tasks (
    id VARCHAR(36) PRIMARY KEY,
    space_id VARCHAR(36) NOT NULL REFERENCES spaces(id),
    project_id VARCHAR(36) NOT NULL,
    title VARCHAR(160) NOT NULL,
    description TEXT NOT NULL,
    acceptance TEXT NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('BACKLOG','READY','IN_PROGRESS','IN_REVIEW','DONE')),
    priority VARCHAR(16) NOT NULL CHECK (priority IN ('LOW','MEDIUM','HIGH','URGENT')),
    blocked BOOLEAN NOT NULL DEFAULT FALSE,
    due_date DATE,
    assignee_id VARCHAR(36) REFERENCES app_users(id),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id, space_id) REFERENCES projects(id, space_id),
    UNIQUE (id, space_id)
);
CREATE TABLE contacts (
    id VARCHAR(36) PRIMARY KEY,
    space_id VARCHAR(36) NOT NULL REFERENCES spaces(id),
    project_id VARCHAR(36),
    name VARCHAR(120) NOT NULL,
    company VARCHAR(160) NOT NULL,
    email VARCHAR(254),
    website VARCHAR(500) NOT NULL,
    stage VARCHAR(24) NOT NULL CHECK (stage IN ('DISCOVERED','QUALIFIED','CONTACTED','NEGOTIATION','WON','LOST','DO_NOT_CONTACT')),
    notes TEXT NOT NULL,
    opted_out BOOLEAN NOT NULL DEFAULT FALSE,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id, space_id) REFERENCES projects(id, space_id),
    UNIQUE (space_id, email),
    UNIQUE (id, space_id)
);
CREATE TABLE notes (
    id VARCHAR(36) PRIMARY KEY,
    space_id VARCHAR(36) NOT NULL REFERENCES spaces(id),
    project_id VARCHAR(36),
    author_id VARCHAR(36) NOT NULL REFERENCES app_users(id),
    title VARCHAR(160) NOT NULL,
    content TEXT NOT NULL,
    is_private BOOLEAN NOT NULL DEFAULT FALSE,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id, space_id) REFERENCES projects(id, space_id)
);
CREATE TABLE mail_drafts (
    id VARCHAR(36) PRIMARY KEY,
    space_id VARCHAR(36) NOT NULL REFERENCES spaces(id),
    project_id VARCHAR(36),
    contact_id VARCHAR(36) NOT NULL,
    author_id VARCHAR(36) NOT NULL REFERENCES app_users(id),
    recipient VARCHAR(254) NOT NULL,
    subject VARCHAR(300) NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SENDING','ACCEPTED','RECONCILE')),
    provider_id VARCHAR(500),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id, space_id) REFERENCES projects(id, space_id),
    FOREIGN KEY (contact_id, space_id) REFERENCES contacts(id, space_id)
);
CREATE TABLE ai_runs (
    id VARCHAR(36) PRIMARY KEY,
    space_id VARCHAR(36) NOT NULL REFERENCES spaces(id),
    project_id VARCHAR(36),
    author_id VARCHAR(36) NOT NULL REFERENCES app_users(id),
    prompt TEXT NOT NULL,
    provider VARCHAR(32) NOT NULL,
    model VARCHAR(200) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('RUNNING','COMPLETED','FAILED')),
    result TEXT,
    error_message VARCHAR(500),
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id, space_id) REFERENCES projects(id, space_id)
);
CREATE TABLE activity (
    id VARCHAR(36) PRIMARY KEY,
    space_id VARCHAR(36) NOT NULL REFERENCES spaces(id),
    actor_id VARCHAR(36) REFERENCES app_users(id),
    category VARCHAR(32) NOT NULL,
    title VARCHAR(300) NOT NULL,
    entity_id VARCHAR(36),
    visible_to VARCHAR(36) REFERENCES app_users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE reports (
    id VARCHAR(36) PRIMARY KEY,
    space_id VARCHAR(36) NOT NULL REFERENCES spaces(id),
    period_key VARCHAR(100) NOT NULL,
    title VARCHAR(200) NOT NULL,
    snapshot TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (space_id, period_key)
);
CREATE INDEX tasks_space_status ON tasks(space_id, status);
CREATE INDEX contacts_space_stage ON contacts(space_id, stage);
CREATE INDEX notes_space_visibility ON notes(space_id, is_private, author_id);
CREATE INDEX activity_space_date ON activity(space_id, created_at);
CREATE INDEX ai_runs_space_author ON ai_runs(space_id, author_id, created_at);
