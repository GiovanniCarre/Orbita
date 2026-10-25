CREATE TABLE contact_exclusions (
    space_id VARCHAR(36) NOT NULL REFERENCES spaces(id),
    email VARCHAR(254) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (space_id, email)
);
