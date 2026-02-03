package com.uzproc.backend.service.cfo;

import com.uzproc.backend.repository.CfoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class CfoService {

    /** Контекст: только ЦФО из позиций плана закупок */
    public static final String FOR_PURCHASE_PLAN_ITEMS = "purchase-plan-items";
    /** Контекст: только ЦФО из заявок на закупку */
    public static final String FOR_PURCHASE_REQUESTS = "purchase-requests";
    /** Контекст: только ЦФО из договоров */
    public static final String FOR_CONTRACTS = "contracts";
    /** Контекст: только ЦФО из закупок */
    public static final String FOR_PURCHASES = "purchases";

    private final CfoRepository cfoRepository;

    public CfoService(CfoRepository cfoRepository) {
        this.cfoRepository = cfoRepository;
    }

    /**
     * Возвращает список названий ЦФО.
     * Если {@code forContext} задан — только те ЦФО, по которым есть данные в указанной сущности.
     * Иначе — все ЦФО (для обратной совместимости).
     *
     * @param forContext один из: purchase-plan-items, purchase-requests, contracts, purchases; или null для всех
     */
    public List<String> getNames(String forContext) {
        List<String> raw;
        if (FOR_PURCHASE_PLAN_ITEMS.equals(forContext)) {
            raw = cfoRepository.findNamesUsedInPurchasePlanItems();
        } else if (FOR_PURCHASE_REQUESTS.equals(forContext)) {
            raw = cfoRepository.findNamesUsedInPurchaseRequests();
        } else if (FOR_CONTRACTS.equals(forContext)) {
            raw = cfoRepository.findNamesUsedInContracts();
        } else if (FOR_PURCHASES.equals(forContext)) {
            raw = cfoRepository.findNamesUsedInPurchases();
        } else {
            raw = cfoRepository.findAll().stream()
                    .map(cfo -> cfo.getName() != null ? cfo.getName().trim() : null)
                    .filter(name -> name != null && !name.isEmpty())
                    .sorted(String::compareToIgnoreCase)
                    .collect(Collectors.toList());
        }
        return raw.stream()
                .map(name -> name != null ? name.trim() : null)
                .filter(name -> name != null && !name.isEmpty())
                .sorted(String::compareToIgnoreCase)
                .distinct()
                .collect(Collectors.toList());
    }

    /**
     * Возвращает список всех названий ЦФО (для обратной совместимости).
     */
    public List<String> getAllNames() {
        return getNames(null);
    }
}
