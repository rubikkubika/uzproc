package com.uzproc.backend.service.mrpresentation;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType0Font;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/** Шрифт презентации Golos Text: начертания 400–800, встроенные в PDF подмножеством. */
final class MrFonts {

    private static final String RESOURCE_DIR = "/fonts/golos-text/";

    private final Map<Integer, PDFont> byWeight = new HashMap<>();
    private final Map<Integer, Map<Integer, Boolean>> glyphCache = new HashMap<>();

    MrFonts(PDDocument document) throws IOException {
        byWeight.put(400, load(document, "GolosText-Regular.ttf"));
        byWeight.put(500, load(document, "GolosText-Medium.ttf"));
        byWeight.put(600, load(document, "GolosText-SemiBold.ttf"));
        byWeight.put(700, load(document, "GolosText-Bold.ttf"));
        byWeight.put(800, load(document, "GolosText-ExtraBold.ttf"));
    }

    private static PDFont load(PDDocument document, String file) throws IOException {
        try (InputStream in = MrFonts.class.getResourceAsStream(RESOURCE_DIR + file)) {
            if (in == null) {
                throw new IOException("Не найден шрифт презентации: " + RESOURCE_DIR + file);
            }
            return PDType0Font.load(document, in, true);
        }
    }

    PDFont get(int weight) {
        PDFont font = byWeight.get(weight);
        return font != null ? font : byWeight.get(400);
    }

    /**
     * Убирает символы, которых нет в шрифте (эмодзи и т.п.): PDFBox на них падает.
     * Пробельные и управляющие символы заменяются обычным пробелом.
     */
    String sanitize(String text, int weight) {
        if (text == null || text.isEmpty()) {
            return "";
        }
        PDFont font = get(weight);
        Map<Integer, Boolean> cache = glyphCache.computeIfAbsent(weight, w -> new HashMap<>());
        StringBuilder result = new StringBuilder(text.length());
        text.codePoints().forEach(cp -> {
            if (Character.isWhitespace(cp) || Character.isSpaceChar(cp) || Character.isISOControl(cp)) {
                result.append(' ');
            } else if (cache.computeIfAbsent(cp, c -> hasGlyph(font, c))) {
                result.appendCodePoint(cp);
            }
        });
        return result.toString();
    }

    private static boolean hasGlyph(PDFont font, int codePoint) {
        try {
            font.encode(new String(Character.toChars(codePoint)));
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
