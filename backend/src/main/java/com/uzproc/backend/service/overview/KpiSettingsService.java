package com.uzproc.backend.service.overview;

import com.uzproc.backend.dto.overview.KpiBlockSettingsDto;
import com.uzproc.backend.dto.overview.KpiSettingsDto;
import com.uzproc.backend.entity.KpiSettings;
import com.uzproc.backend.repository.KpiSettingsRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Чтение и сохранение настроек KPI-премии (singleton, id = 1).
 * Настройки общие для всех пользователей.
 */
@Service
public class KpiSettingsService {

    private static final Long SINGLETON_ID = 1L;

    private final KpiSettingsRepository repository;

    public KpiSettingsService(KpiSettingsRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public KpiSettingsDto get() {
        return toDto(repository.findById(SINGLETON_ID).orElseGet(KpiSettings::new));
    }

    @Transactional
    public KpiSettingsDto save(KpiSettingsDto dto) {
        KpiSettings entity = repository.findById(SINGLETON_ID).orElseGet(() -> {
            KpiSettings e = new KpiSettings();
            e.setId(SINGLETON_ID);
            return e;
        });

        applyBlock(dto.getSavings(),
                entity::setSavingsTarget, entity::setSavingsWeight, entity::setSavingsAllowBoost);
        applyBlock(dto.getSla(),
                entity::setSlaTarget, entity::setSlaWeight, entity::setSlaAllowBoost);
        applyBlock(dto.getCsi(),
                entity::setCsiTarget, entity::setCsiWeight, entity::setCsiAllowBoost);

        return toDto(repository.save(entity));
    }

    private interface DoubleSetter { void set(Double value); }
    private interface BooleanSetter { void set(Boolean value); }

    private void applyBlock(KpiBlockSettingsDto block,
                            DoubleSetter targetSetter,
                            DoubleSetter weightSetter,
                            BooleanSetter allowBoostSetter) {
        if (block == null) return;
        if (block.getTarget() != null) targetSetter.set(block.getTarget());
        if (block.getWeight() != null) weightSetter.set(block.getWeight());
        if (block.getAllowBoost() != null) allowBoostSetter.set(block.getAllowBoost());
    }

    private KpiSettingsDto toDto(KpiSettings e) {
        return new KpiSettingsDto(
                new KpiBlockSettingsDto(e.getSavingsTarget(), e.getSavingsWeight(), e.getSavingsAllowBoost()),
                new KpiBlockSettingsDto(e.getSlaTarget(), e.getSlaWeight(), e.getSlaAllowBoost()),
                new KpiBlockSettingsDto(e.getCsiTarget(), e.getCsiWeight(), e.getCsiAllowBoost())
        );
    }
}
