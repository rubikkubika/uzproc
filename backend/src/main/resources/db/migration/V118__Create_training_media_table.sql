CREATE TABLE training_media (
    id          BIGSERIAL PRIMARY KEY,
    slide_id    INTEGER      NOT NULL,
    type        VARCHAR(10)  NOT NULL CHECK (type IN ('audio', 'video')),
    filename    VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    content_type  VARCHAR(100),
    file_size   BIGINT,
    uploaded_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_training_media_slide_type UNIQUE (slide_id, type)
);
