import { ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardTypeOptions,
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { radius, space, useTheme } from './theme';

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

type TextVariant = 'title' | 'heading' | 'subheading' | 'body' | 'caption' | 'label';

const textSizes: Record<TextVariant, TextStyle> = {
  title: { fontSize: 28, fontWeight: '700', lineHeight: 34 },
  heading: { fontSize: 20, fontWeight: '700', lineHeight: 26 },
  subheading: { fontSize: 17, fontWeight: '600', lineHeight: 22 },
  body: { fontSize: 16, lineHeight: 22 },
  caption: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 15, fontWeight: '600', lineHeight: 20 },
};

export function AppText({
  variant = 'body',
  muted,
  style,
  children,
  accessibilityRole,
  testID,
}: {
  variant?: TextVariant;
  muted?: boolean;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
  accessibilityRole?: 'header' | 'text';
  testID?: string;
}) {
  const t = useTheme();
  return (
    <Text
      testID={testID}
      accessibilityRole={accessibilityRole ?? (variant === 'title' || variant === 'heading' ? 'header' : undefined)}
      style={[textSizes[variant], { color: muted ? t.textMuted : t.text }, style]}
    >
      {children}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export function Screen({ children, scroll = true, testID }: { children: ReactNode; scroll?: boolean; testID?: string }) {
  const t = useTheme();
  const content = <View style={styles.screenInner}>{children}</View>;
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: t.bg }} testID={testID}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.screenScroll} keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style, tone = 'default', testID }: { children: ReactNode; style?: StyleProp<ViewStyle>; tone?: 'default' | 'info' | 'warning' | 'danger' | 'primary'; testID?: string }) {
  const t = useTheme();
  const bg = { default: t.surface, info: t.infoSoft, warning: t.warningSoft, danger: t.dangerSoft, primary: t.primarySoft }[tone];
  return (
    <View testID={testID} style={[styles.card, { backgroundColor: bg, borderColor: t.border }, style]}>
      {children}
    </View>
  );
}

export function Row({ children, style, gap = space.sm, wrap }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number; wrap?: boolean }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>{children}</View>;
}

export function Stack({ children, gap = space.md, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ gap }, style]}>{children}</View>;
}

export function Divider() {
  const t = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.border, marginVertical: space.sm }} />;
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, backgroundColor: t.bg }} accessibilityLabel={label}>
      <ActivityIndicator color={t.primary} />
      <AppText muted style={{ marginTop: space.sm }}>
        {label}
      </AppText>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  accessibilityLabel,
  accessibilityHint,
  testID,
  compact,
  style,
}: {
  label: string;
  onPress: () => void | Promise<void>;
  variant?: ButtonVariant;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const [busy, setBusy] = useState(false);
  const palette: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: { bg: t.primary, fg: t.onPrimary, border: t.primary },
    secondary: { bg: t.surface, fg: t.primary, border: t.primary },
    ghost: { bg: 'transparent', fg: t.primary, border: 'transparent' },
    danger: { bg: t.surface, fg: t.danger, border: t.danger },
  };
  const c = palette[variant];
  const isDisabled = disabled || busy;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!isDisabled, busy }}
      disabled={isDisabled}
      onPress={async () => {
        setBusy(true);
        try {
          await onPress();
        } finally {
          setBusy(false);
        }
      }}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        { backgroundColor: c.bg, borderColor: c.border, opacity: isDisabled ? 0.5 : pressed ? 0.8 : 1 },
        style,
      ]}
    >
      <Text style={[styles.buttonText, compact && { fontSize: 15 }, { color: c.fg }]}>{label}</Text>
    </Pressable>
  );
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  helper,
  keyboardType,
  multiline,
  accessibilityLabel,
  testID,
  maxLength,
  autoCapitalize,
  style,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  error?: string | null;
  helper?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <View style={[{ gap: space.xs }, style]}>
      <AppText variant="label">{label}</AppText>
      {helper ? (
        <AppText variant="caption" muted>
          {helper}
        </AppText>
      ) : null}
      <TextInput
        testID={testID}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={error ?? undefined}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.textMuted}
        keyboardType={keyboardType}
        multiline={multiline}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
        style={[
          styles.input,
          multiline && { minHeight: 88, textAlignVertical: 'top' },
          { color: t.text, backgroundColor: t.surface, borderColor: error ? t.danger : t.border },
        ]}
      />
      {error ? (
        <AppText variant="caption" style={{ color: t.danger }} accessibilityRole="text">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

export interface Option<T extends string> {
  value: T;
  label: string;
  hint?: string | null;
}

export function ChoiceChips<T extends string>({
  label,
  options,
  value,
  onChange,
  helper,
  testIDPrefix,
}: {
  label: string;
  options: readonly Option<T>[];
  value: T | null;
  onChange: (v: T | null) => void;
  helper?: string;
  testIDPrefix?: string;
}) {
  return (
    <View style={{ gap: space.xs }} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <AppText variant="label">{label}</AppText>
      {helper ? (
        <AppText variant="caption" muted>
          {helper}
        </AppText>
      ) : null}
      <View style={styles.chipWrap}>
        {options.map((o) => (
          <Chip
            key={o.value}
            label={o.label}
            hint={o.hint}
            selected={value === o.value}
            role="radio"
            testID={testIDPrefix ? `${testIDPrefix}-${o.value}` : undefined}
            onPress={() => onChange(value === o.value ? null : o.value)}
          />
        ))}
      </View>
    </View>
  );
}

export function MultiChips<T extends string>({
  label,
  options,
  value,
  onChange,
  helper,
  testIDPrefix,
}: {
  label: string;
  options: readonly Option<T>[];
  value: T[];
  onChange: (v: T[]) => void;
  helper?: string;
  testIDPrefix?: string;
}) {
  return (
    <View style={{ gap: space.xs }} accessibilityLabel={label}>
      <AppText variant="label">{label}</AppText>
      {helper ? (
        <AppText variant="caption" muted>
          {helper}
        </AppText>
      ) : null}
      <View style={styles.chipWrap}>
        {options.map((o) => {
          const selected = value.includes(o.value);
          return (
            <Chip
              key={o.value}
              label={o.label}
              hint={o.hint}
              selected={selected}
              role="checkbox"
              testID={testIDPrefix ? `${testIDPrefix}-${o.value}` : undefined}
              onPress={() => onChange(selected ? value.filter((v) => v !== o.value) : [...value, o.value])}
            />
          );
        })}
      </View>
    </View>
  );
}

function Chip({ label, hint, selected, onPress, role, testID }: { label: string; hint?: string | null; selected: boolean; onPress: () => void; role: 'radio' | 'checkbox'; testID?: string }) {
  const t = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole={role}
      accessibilityState={{ checked: selected, selected }}
      aria-checked={selected}
      accessibilityLabel={hint ? `${label}. ${hint}` : label}
      onPress={onPress}
      style={[styles.chip, { borderColor: selected ? t.primary : t.border, backgroundColor: selected ? t.primarySoft : t.surface }]}
    >
      <Text style={{ color: selected ? t.primary : t.text, fontSize: 15, fontWeight: selected ? '600' : '400' }}>
        {selected ? '✓ ' : ''}
        {label}
      </Text>
      {hint ? <Text style={{ color: t.textMuted, fontSize: 12 }}>{hint}</Text> : null}
    </Pressable>
  );
}

export function ToggleRow({ label, value, onChange, helper, testID, accessibilityLabel }: { label: string; value: boolean; onChange: (v: boolean) => void; helper?: string; testID?: string; accessibilityLabel?: string }) {
  const t = useTheme();
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <View style={{ flex: 1 }}>
        <AppText variant="label">{label}</AppText>
        {helper ? (
          <AppText variant="caption" muted>
            {helper}
          </AppText>
        ) : null}
      </View>
      <Switch
        testID={testID}
        accessibilityLabel={accessibilityLabel ?? label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: t.primary, false: t.border }}
      />
    </Row>
  );
}

export function Checkbox({ checked, onPress, label, testID, disabled }: { checked: boolean; onPress: () => void; label: string; testID?: string; disabled?: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled: !!disabled }}
      aria-checked={checked}
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      style={[styles.checkbox, { borderColor: checked ? t.primary : t.border, backgroundColor: checked ? t.primary : t.surface, opacity: disabled ? 0.5 : 1 }]}
    >
      {checked ? <Text style={{ color: t.onPrimary, fontWeight: '800', fontSize: 16 }}>✓</Text> : null}
    </Pressable>
  );
}

export function Badge({ label, tone = 'default' }: { label: string; tone?: 'default' | 'info' | 'warning' | 'primary' | 'danger' }) {
  const t = useTheme();
  const map = {
    default: [t.surfaceAlt, t.textMuted],
    info: [t.infoSoft, t.info],
    warning: [t.warningSoft, t.warning],
    primary: [t.primarySoft, t.primary],
    danger: [t.dangerSoft, t.danger],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' }}>
      <Text style={{ color: fg, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

/** Clearly marks functionality that has not been built yet. Never pretend. */
export function NotAvailable({ title, detail, milestone }: { title: string; detail: string; milestone?: string }) {
  return (
    <Card tone="warning" testID="not-available">
      <Stack gap={space.xs}>
        <Badge label={milestone ? `Not available yet · ${milestone}` : 'Not available yet'} tone="warning" />
        <AppText variant="subheading">{title}</AppText>
        <AppText variant="caption">{detail}</AppText>
      </Stack>
    </Card>
  );
}

export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const t = useTheme();
  const pct = Math.max(0, Math.min(1, max === 0 ? 0 : value / max));
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max, now: value }}>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: t.surfaceAlt, overflow: 'hidden' }}>
        <View style={{ width: `${pct * 100}%`, height: 8, backgroundColor: value > max ? t.danger : t.primary }} />
      </View>
    </View>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: space.sm }}>
      <AppText variant="heading">{title}</AppText>
      {action}
    </Row>
  );
}

export function ListRow({ title, subtitle, onPress, right, testID, accessibilityLabel }: { title: string; subtitle?: string; onPress?: () => void; right?: ReactNode; testID?: string; accessibilityLabel?: string }) {
  const t = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel ?? (subtitle ? `${title}. ${subtitle}` : title)}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.listRow, { backgroundColor: t.surface, borderColor: t.border, opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="label">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" muted>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right ?? (onPress ? <Text style={{ color: t.textMuted, fontSize: 20 }}>›</Text> : null)}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Dialog (cross-platform; react-native-web has no working Alert)
// ---------------------------------------------------------------------------

export interface DialogAction {
  label: string;
  onPress: () => void | Promise<void>;
  variant?: ButtonVariant;
  testID?: string;
}

export function Dialog({ visible, title, message, actions, onDismiss }: { visible: boolean; title: string; message: string; actions: DialogAction[]; onDismiss: () => void }) {
  const t = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal accessibilityRole="alert" style={[styles.dialog, { backgroundColor: t.surface, borderColor: t.border }]} testID="dialog">
          <Stack gap={space.sm}>
            <AppText variant="heading">{title}</AppText>
            <AppText>{message}</AppText>
            <Stack gap={space.sm} style={{ marginTop: space.sm }}>
              {actions.map((a) => (
                <Button key={a.label} label={a.label} variant={a.variant ?? 'secondary'} onPress={a.onPress} testID={a.testID} />
              ))}
            </Stack>
          </Stack>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screenScroll: { paddingBottom: space.xxl },
  screenInner: { padding: space.lg, gap: space.lg, width: '100%', maxWidth: 720, alignSelf: 'center' },
  card: { borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, padding: space.lg },
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonCompact: { minHeight: 40, paddingHorizontal: space.md },
  buttonText: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  input: { minHeight: 48, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: space.md, paddingVertical: 10, fontSize: 16 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, minHeight: 44, justifyContent: 'center' },
  checkbox: { width: 32, height: 32, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: space.lg },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: space.lg },
  dialog: { width: '100%', maxWidth: 420, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: space.xl },
});
