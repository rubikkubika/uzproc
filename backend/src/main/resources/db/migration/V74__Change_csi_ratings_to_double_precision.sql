-- Изменение типа колонок рейтингов с DECIMAL на DOUBLE PRECISION для совместимости с Hibernate
ALTER TABLE csi_feedback 
ALTER COLUMN uzproc_rating TYPE DOUBLE PRECISION USING uzproc_rating::double precision,
ALTER COLUMN speed_rating TYPE DOUBLE PRECISION USING speed_rating::double precision,
ALTER COLUMN quality_rating TYPE DOUBLE PRECISION USING quality_rating::double precision,
ALTER COLUMN satisfaction_rating TYPE DOUBLE PRECISION USING satisfaction_rating::double precision;
