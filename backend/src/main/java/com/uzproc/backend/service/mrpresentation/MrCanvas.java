package com.uzproc.backend.service.mrpresentation;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.graphics.state.PDExtendedGraphicsState;

import java.awt.Color;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Холст слайда: примитивы рисования в координатах макета (начало — левый верхний угол, ось Y вниз, px).
 * Всё рисуется вектором, текст — встроенным шрифтом.
 */
final class MrCanvas implements AutoCloseable {

    /** Метрики Golos Text в долях кегля: подъём над базовой линией, полная высота и высота прописных. */
    private static final float ASCENT = 0.98f;
    private static final float CONTENT_HEIGHT = 1.2f;
    private static final float CAP_HEIGHT = 0.70f;
    /** Коэффициент кривой Безье для четверти окружности. */
    private static final float KAPPA = 0.5522848f;
    private static final float H = MrTheme.SLIDE_HEIGHT;
    private static final Pattern PATH_TOKEN = Pattern.compile("[MLHVCZz]|-?\\d*\\.?\\d+(?:[eE][-+]?\\d+)?");

    private final PDDocument document;
    private final MrFonts fonts;
    private final Map<Float, PDExtendedGraphicsState> alphaStates = new HashMap<>();
    private PDPageContentStream stream;

    MrCanvas(PDDocument document, MrFonts fonts) {
        this.document = document;
        this.fonts = fonts;
    }

    /** Начинает новый слайд с заливкой фона. */
    void newSlide(Color background) {
        closeStream();
        PDPage page = new PDPage(new PDRectangle(MrTheme.SLIDE_WIDTH, MrTheme.SLIDE_HEIGHT));
        document.addPage(page);
        run(() -> stream = new PDPageContentStream(document, page));
        fillRect(0, 0, MrTheme.SLIDE_WIDTH, MrTheme.SLIDE_HEIGHT, background);
    }

    @Override
    public void close() {
        closeStream();
    }

    private void closeStream() {
        if (stream != null) {
            run(() -> stream.close());
            stream = null;
        }
    }

    /* ─── Фигуры ────────────────────────────────────────────────────────── */

    void fillRect(double x, double y, double w, double h, Color color) {
        run(() -> {
            stream.setNonStrokingColor(color);
            stream.addRect((float) x, H - (float) (y + h), (float) w, (float) h);
            stream.fill();
        });
    }

    void fillRoundRect(double x, double y, double w, double h, double radius, Color color) {
        fillRoundRect(x, y, w, h, radius, color, 1);
    }

    void fillRoundRect(double x, double y, double w, double h, double radius, Color color, double alpha) {
        withAlpha(alpha, () -> {
            stream.setNonStrokingColor(color);
            roundRectPath(x, y, w, h, radius);
            stream.fill();
        });
    }

    /** Обводка скруглённого прямоугольника; {@code dash} — длина штриха (0 — сплошная линия). */
    void strokeRoundRect(double x, double y, double w, double h, double radius, Color color, double lineWidth,
                         double dash) {
        run(() -> {
            stream.saveGraphicsState();
            stream.setStrokingColor(color);
            stream.setLineWidth((float) lineWidth);
            if (dash > 0) {
                stream.setLineDashPattern(new float[]{(float) dash, (float) dash}, 0);
            }
            double inset = lineWidth / 2;
            roundRectPath(x + inset, y + inset, w - lineWidth, h - lineWidth, Math.max(0, radius - inset));
            stream.stroke();
            stream.restoreGraphicsState();
        });
    }

    private void roundRectPath(double x, double y, double w, double h, double radius) throws IOException {
        float r = (float) Math.max(0, Math.min(radius, Math.min(w, h) / 2));
        float left = (float) x;
        float right = (float) (x + w);
        float top = H - (float) y;
        float bottom = H - (float) (y + h);
        if (r == 0) {
            stream.addRect(left, bottom, (float) w, (float) h);
            return;
        }
        float k = r * KAPPA;
        stream.moveTo(left + r, top);
        stream.lineTo(right - r, top);
        stream.curveTo(right - r + k, top, right, top - r + k, right, top - r);
        stream.lineTo(right, bottom + r);
        stream.curveTo(right, bottom + r - k, right - r + k, bottom, right - r, bottom);
        stream.lineTo(left + r, bottom);
        stream.curveTo(left + r - k, bottom, left, bottom + r - k, left, bottom + r);
        stream.lineTo(left, top - r);
        stream.curveTo(left, top - r + k, left + r - k, top, left + r, top);
        stream.closePath();
    }

    void line(double x1, double y1, double x2, double y2, Color color, double width) {
        polyline(List.of(new double[]{x1, y1}, new double[]{x2, y2}), color, width);
    }

    /** Ломаная со скруглёнными концами и стыками. */
    void polyline(List<double[]> points, Color color, double width) {
        if (points.size() < 2) {
            return;
        }
        run(() -> {
            stream.saveGraphicsState();
            stream.setStrokingColor(color);
            stream.setLineWidth((float) width);
            stream.setLineCapStyle(1);
            stream.setLineJoinStyle(1);
            stream.moveTo((float) points.get(0)[0], H - (float) points.get(0)[1]);
            for (int i = 1; i < points.size(); i++) {
                stream.lineTo((float) points.get(i)[0], H - (float) points.get(i)[1]);
            }
            stream.stroke();
            stream.restoreGraphicsState();
        });
    }

    /** Круг с заливкой и обводкой (любая из них может отсутствовать). */
    void circle(double cx, double cy, double radius, Color fill, Color stroke, double strokeWidth, double alpha) {
        withAlpha(alpha, () -> {
            float r = (float) radius;
            float k = r * KAPPA;
            float x = (float) cx;
            float y = H - (float) cy;
            stream.moveTo(x + r, y);
            stream.curveTo(x + r, y + k, x + k, y + r, x, y + r);
            stream.curveTo(x - k, y + r, x - r, y + k, x - r, y);
            stream.curveTo(x - r, y - k, x - k, y - r, x, y - r);
            stream.curveTo(x + k, y - r, x + r, y - k, x + r, y);
            stream.closePath();
            if (fill != null) {
                stream.setNonStrokingColor(fill);
            }
            if (stroke != null) {
                stream.setStrokingColor(stroke);
                stream.setLineWidth((float) strokeWidth);
            }
            if (fill != null && stroke != null) {
                stream.fillAndStroke();
            } else if (fill != null) {
                stream.fill();
            } else {
                stream.stroke();
            }
        });
    }

    /** Многоугольник по точкам в системе {@code viewBox}, вписанный в квадрат {@code size} с углом (x, y). */
    void fillPolygon(double x, double y, double size, double viewBox, double[][] points, Color color) {
        double scale = size / viewBox;
        run(() -> {
            stream.setNonStrokingColor(color);
            for (int i = 0; i < points.length; i++) {
                float px = (float) (x + points[i][0] * scale);
                float py = H - (float) (y + points[i][1] * scale);
                if (i == 0) {
                    stream.moveTo(px, py);
                } else {
                    stream.lineTo(px, py);
                }
            }
            stream.closePath();
            stream.fill();
        });
    }

    /**
     * SVG-контур (абсолютные команды M, L, H, V, C, Z), вписанный в квадрат {@code size}
     * по ширине {@code viewBoxWidth}.
     */
    void fillSvgPath(double x, double y, double size, double viewBoxWidth, String path, Color color) {
        double scale = size / viewBoxWidth;
        List<String> tokens = new ArrayList<>();
        Matcher matcher = PATH_TOKEN.matcher(path);
        while (matcher.find()) {
            tokens.add(matcher.group());
        }
        run(() -> {
            stream.setNonStrokingColor(color);
            double curX = 0;
            double curY = 0;
            char command = 'M';
            int i = 0;
            while (i < tokens.size()) {
                String token = tokens.get(i);
                if (Character.isLetter(token.charAt(0))) {
                    command = token.charAt(0);
                    i++;
                    if (command == 'Z' || command == 'z') {
                        stream.closePath();
                    }
                    continue;
                }
                switch (command) {
                    case 'M', 'L' -> {
                        curX = Double.parseDouble(tokens.get(i));
                        curY = Double.parseDouble(tokens.get(i + 1));
                        i += 2;
                        float px = (float) (x + curX * scale);
                        float py = H - (float) (y + curY * scale);
                        if (command == 'M') {
                            stream.moveTo(px, py);
                            command = 'L';
                        } else {
                            stream.lineTo(px, py);
                        }
                    }
                    case 'H' -> {
                        curX = Double.parseDouble(tokens.get(i++));
                        stream.lineTo((float) (x + curX * scale), H - (float) (y + curY * scale));
                    }
                    case 'V' -> {
                        curY = Double.parseDouble(tokens.get(i++));
                        stream.lineTo((float) (x + curX * scale), H - (float) (y + curY * scale));
                    }
                    case 'C' -> {
                        double[] v = new double[6];
                        for (int n = 0; n < 6; n++) {
                            v[n] = Double.parseDouble(tokens.get(i + n));
                        }
                        i += 6;
                        stream.curveTo(
                                (float) (x + v[0] * scale), H - (float) (y + v[1] * scale),
                                (float) (x + v[2] * scale), H - (float) (y + v[3] * scale),
                                (float) (x + v[4] * scale), H - (float) (y + v[5] * scale));
                        curX = v[4];
                        curY = v[5];
                    }
                    default -> throw new IllegalArgumentException("Неподдерживаемая команда контура: " + command);
                }
            }
            stream.fill();
        });
    }

    /** Рисует содержимое, обрезая его прямоугольником. */
    void clipped(double x, double y, double w, double h, Runnable drawing) {
        run(() -> {
            stream.saveGraphicsState();
            stream.addRect((float) x, H - (float) (y + h), (float) w, (float) h);
            stream.clip();
        });
        try {
            drawing.run();
        } finally {
            run(() -> stream.restoreGraphicsState());
        }
    }

    /* ─── Текст ─────────────────────────────────────────────────────────── */

    /** Ширина строки с учётом трекинга. */
    float textWidth(String text, MrText style) {
        String clean = fonts.sanitize(text, style.weight());
        if (clean.isEmpty()) {
            return 0;
        }
        try {
            return fonts.get(style.weight()).getStringWidth(clean) / 1000f * style.size()
                    + style.tracking() * style.size() * clean.length();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** Строка от левого края; {@code top} — верх строки высотой {@code lineHeight}. Возвращает ширину. */
    float text(String text, double x, double top, MrText style) {
        float baseline = (float) top + (style.lineHeight() - CONTENT_HEIGHT * style.size()) / 2 + ASCENT * style.size();
        return drawText(text, x, baseline, style);
    }

    /** Строка, прижатая правым краем к {@code right}. */
    float textRight(String text, double right, double top, MrText style) {
        return text(text, right - textWidth(text, style), top, style);
    }

    /** Строка по центру отрезка шириной {@code width}. */
    float textCenter(String text, double x, double width, double top, MrText style) {
        return text(text, x + (width - textWidth(text, style)) / 2, top, style);
    }

    /** Строка от левого края, выровненная по оптическому центру {@code centerY} (по высоте прописных). */
    float textMiddle(String text, double x, double centerY, MrText style) {
        return drawText(text, x, (float) centerY + CAP_HEIGHT * style.size() / 2, style);
    }

    float textMiddleRight(String text, double right, double centerY, MrText style) {
        return textMiddle(text, right - textWidth(text, style), centerY, style);
    }

    float textMiddleCenter(String text, double x, double width, double centerY, MrText style) {
        return textMiddle(text, x + (width - textWidth(text, style)) / 2, centerY, style);
    }

    /** Строка от левого края по заданной базовой линии. */
    float textBaseline(String text, double x, double baseline, MrText style) {
        return drawText(text, x, (float) baseline, style);
    }

    /** Базовая линия строки, верх которой находится в {@code top}. */
    static float baselineOf(double top, MrText style) {
        return (float) top + (style.lineHeight() - CONTENT_HEIGHT * style.size()) / 2 + ASCENT * style.size();
    }

    private float drawText(String text, double x, float baseline, MrText style) {
        String clean = fonts.sanitize(text, style.weight());
        if (clean.isEmpty()) {
            return 0;
        }
        withAlpha(style.alpha(), () -> {
            stream.beginText();
            stream.setFont(fonts.get(style.weight()), style.size());
            stream.setNonStrokingColor(style.color());
            stream.setCharacterSpacing(style.tracking() * style.size());
            stream.newLineAtOffset((float) x, H - baseline);
            stream.showText(clean);
            stream.endText();
        });
        return textWidth(clean, style);
    }

    /** Перенос текста по словам в заданную ширину; слишком длинное слово режется посимвольно. */
    List<String> wrap(String text, MrText style, double maxWidth) {
        List<String> lines = new ArrayList<>();
        String clean = fonts.sanitize(text, style.weight()).replaceAll("\\s+", " ").trim();
        if (clean.isEmpty()) {
            return lines;
        }
        StringBuilder current = new StringBuilder();
        for (String word : clean.split(" ")) {
            String candidate = current.isEmpty() ? word : current + " " + word;
            if (textWidth(candidate, style) <= maxWidth) {
                current.setLength(0);
                current.append(candidate);
                continue;
            }
            if (!current.isEmpty()) {
                lines.add(current.toString());
                current.setLength(0);
            }
            String rest = word;
            while (textWidth(rest, style) > maxWidth && rest.length() > 1) {
                int cut = rest.length() - 1;
                while (cut > 1 && textWidth(rest.substring(0, cut), style) > maxWidth) {
                    cut--;
                }
                lines.add(rest.substring(0, cut));
                rest = rest.substring(cut);
            }
            current.append(rest);
        }
        if (!current.isEmpty()) {
            lines.add(current.toString());
        }
        return lines;
    }

    /** Укорачивает строку с многоточием, чтобы она поместилась в ширину. */
    String fit(String text, MrText style, double maxWidth) {
        String clean = fonts.sanitize(text, style.weight()).trim();
        if (textWidth(clean, style) <= maxWidth) {
            return clean;
        }
        String cut = clean;
        while (cut.length() > 1 && textWidth(cut + "…", style) > maxWidth) {
            cut = cut.substring(0, cut.length() - 1);
        }
        return cut.trim() + "…";
    }

    /* ─── Служебное ─────────────────────────────────────────────────────── */

    private void withAlpha(double alpha, Drawing drawing) {
        run(() -> {
            if (alpha >= 1) {
                drawing.draw();
                return;
            }
            stream.saveGraphicsState();
            stream.setGraphicsStateParameters(alphaStates.computeIfAbsent((float) alpha, a -> {
                PDExtendedGraphicsState state = new PDExtendedGraphicsState();
                state.setNonStrokingAlphaConstant(a);
                state.setStrokingAlphaConstant(a);
                return state;
            }));
            drawing.draw();
            stream.restoreGraphicsState();
        });
    }

    private static void run(Drawing drawing) {
        try {
            drawing.draw();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @FunctionalInterface
    private interface Drawing {
        void draw() throws IOException;
    }
}
