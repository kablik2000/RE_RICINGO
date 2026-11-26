import ui from '@/components/ui.module.css';
import { t } from '@/i18n';
import { formatMonthLong, formatMonthShort } from '@/lib/format';

import styles from './charts.module.css';

/**
 * Small single-series charts for the statistics page. One series each, so one hue (the primary
 * colour) and no legend: the card title names the series. Values are written next to the bars
 * (the numbers are small), every bar has a tooltip, and screen readers get a table.
 */

export interface BarItem {
  key: string;
  label: string;
  value: number;
}

function share(value: number, max: number): string {
  return `${String(max === 0 ? 0 : (value / max) * 100)}%`;
}

/** Horizontal bars, one per category, in the given order (e.g. levels A1 → C2). */
export function BarList({ items }: { items: readonly BarItem[] }) {
  const max = Math.max(0, ...items.map((item) => item.value));
  return (
    <ul className={styles.barList}>
      {items.map((item) => (
        <li
          key={item.key}
          className={styles.barRow}
          title={t('statistics.barValue', { label: item.label, value: item.value })}>
          <span className={styles.barLabel}>{item.label}</span>
          <span className={styles.barTrack} aria-hidden="true">
            {item.value > 0 && (
              <span className={styles.barFill} style={{ width: share(item.value, max) }} />
            )}
          </span>
          <span className={styles.barValue}>{item.value}</span>
        </li>
      ))}
    </ul>
  );
}

export interface MonthValue {
  month: string; // "2026-11"
  value: number;
}

/** Columns per month, oldest first; zero months keep their place on the axis. */
export function MonthChart({ title, data }: { title: string; data: readonly MonthValue[] }) {
  const max = Math.max(0, ...data.map((point) => point.value));
  return (
    <figure className={styles.monthFigure}>
      <figcaption className={styles.monthTitle}>{title}</figcaption>
      {max === 0 && (
        <p className={`${ui.muted ?? ''} ${styles.empty ?? ''}`}>{t('statistics.noActivity')}</p>
      )}
      <div className={styles.columns} aria-hidden="true">
        {data.map((point) => (
          <div
            key={point.month}
            className={styles.column}
            title={t('statistics.barValue', {
              label: formatMonthLong(point.month),
              value: point.value,
            })}>
            <span className={styles.columnValue}>{point.value > 0 ? point.value : ''}</span>
            <span className={styles.columnTrack}>
              {point.value > 0 && (
                <span className={styles.columnFill} style={{ height: share(point.value, max) }} />
              )}
            </span>
            <span className={styles.columnLabel}>{formatMonthShort(point.month)}</span>
          </div>
        ))}
      </div>
      <table className={ui.visuallyHidden}>
        <thead>
          <tr>
            <th scope="col">{t('statistics.month')}</th>
            <th scope="col">{t('statistics.count')}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.month}>
              <th scope="row">{formatMonthLong(point.month)}</th>
              <td>{point.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
