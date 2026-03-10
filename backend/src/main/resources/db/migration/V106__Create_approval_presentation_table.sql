CREATE TABLE approval_presentations (
    id          SERIAL PRIMARY KEY,
    conclusions TEXT    NOT NULL DEFAULT '[]',
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
