import { useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, KeyboardAvoidingView, Platform,
  Pressable, SafeAreaView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/useAuthStore';

const { height: SCREEN_H } = Dimensions.get('window');

// ─── Helpers ────────────────────────────────────────────────────────────────────
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

function strengthLevel(pwd: string) {
  if (pwd.length === 0) return 0;
  if (pwd.length < 6)   return 1;
  if (pwd.length < 9)   return 2;
  return 3;
}
const STRENGTH_COLORS = ['#1e1e3f', '#ff4466', '#00d4ff', '#00ff88'];
const STRENGTH_LABELS = ['', 'FRACA', 'MÉDIA', 'FORTE'];

function parseError(err: any): string {
  const serverMsg: string = err?.response?.data?.error ?? err?.response?.data?.message ?? '';
  if (serverMsg) {
    if (serverMsg.toLowerCase().includes('já cadastrado') || serverMsg.includes('UNIQUE'))
      return 'E-mail já cadastrado. Tente fazer login ou use outro endereço.';
    if (serverMsg.toLowerCase().includes('obrigatório'))
      return 'E-mail e senha são obrigatórios.';
    return serverMsg;
  }
  if (err?.message === 'Network Error')
    return 'Servidor offline. Certifique-se de que o backend está rodando na porta 5000.';
  return err?.message ?? 'Erro desconhecido. Tente novamente.';
}

// ─── Partícula de fundo ──────────────────────────────────────────────────────────
function Particle({ x, y, size, duration }: { x: string; y: number; size: number; duration: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.6, duration, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0,   duration, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View
      style={{
        position: 'absolute', left: x as any, top: y,
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: '#7c3aed', opacity,
      }}
    />
  );
}

// ─── Overlay de sucesso ──────────────────────────────────────────────────────────
function SuccessOverlay({ onDone }: { onDone: () => void }) {
  const scale   = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const ring    = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale,   { toValue: 1, useNativeDriver: true, speed: 12 }),
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(ring, { toValue: 1.15, duration: 700, useNativeDriver: true }),
        Animated.timing(ring, { toValue: 0.8,  duration: 700, useNativeDriver: true }),
      ])
    ).start();
    setTimeout(onDone, 2200);
  }, []);

  return (
    <Animated.View style={[s.successOverlay, { opacity }]}>
      <Animated.View style={[s.successCard, { transform: [{ scale }] }]}>
        <Animated.View style={[s.successRing, { transform: [{ scale: ring }] }]} />
        <Text style={s.successIcon}>✓</Text>
        <Text style={s.successTitle}>CONTA CRIADA</Text>
        <Text style={s.successSub}>Redirecionando para o login...</Text>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Botão com glow de mouse ─────────────────────────────────────────────────────
function GlowButton({ onPress, loading, disabled }: { onPress: () => void; loading: boolean; disabled: boolean }) {
  const [glowPos, setGlowPos] = useState({ x: 0, y: 0 });
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const btnScale    = useRef(new Animated.Value(1)).current;

  const spring = (to: number) =>
    Animated.spring(btnScale, { toValue: to, useNativeDriver: true, speed: 20 }).start();

  const webEvents = Platform.OS === 'web' ? {
    onMouseEnter: () => Animated.timing(glowOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start(),
    onMouseLeave: () => Animated.timing(glowOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(),
    onMouseMove:  (e: any) => setGlowPos({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY }),
  } : {};

  return (
    <Animated.View style={{ transform: [{ scale: btnScale }], opacity: disabled ? 0.6 : 1 }}>
      <Pressable
        style={[s.button, loading && s.buttonLoading]}
        onPressIn={() => spring(0.96)}
        onPressOut={() => spring(1)}
        onPress={onPress}
        disabled={disabled}
        {...webEvents}
      >
        <Animated.View
          style={[s.buttonGlow, { opacity: glowOpacity, left: glowPos.x - 70, top: glowPos.y - 70 }]}
          pointerEvents="none"
        />
        <Text style={s.buttonText}>{loading ? 'PROCESSANDO...' : 'CRIAR CONTA  →'}</Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Tela principal ──────────────────────────────────────────────────────────────
export default function SignupScreen() {
  const [name,            setName]            = useState('');
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [errors,   setErrors]   = useState<Record<string, string>>({});

  const register = useAuthStore((state) => state.register);
  const router   = useRouter();

  // Animações do logo
  const logoRotate = useRef(new Animated.Value(0)).current;
  const logoScale  = useRef(new Animated.Value(1)).current;
  const logoGlow   = useRef(new Animated.Value(0.4)).current;
  // Glitch no título
  const glitchX    = useRef(new Animated.Value(0)).current;
  const glitchOp   = useRef(new Animated.Value(1)).current;
  // Linha de scan
  const scanY      = useRef(new Animated.Value(-4)).current;
  // Shake no erro
  const errorShake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo: rotação lenta
    Animated.loop(
      Animated.timing(logoRotate, { toValue: 1, duration: 9000, useNativeDriver: true })
    ).start();
    // Logo: pulso de escala
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoScale, { toValue: 1.12, duration: 1600, useNativeDriver: true }),
        Animated.timing(logoScale, { toValue: 1,    duration: 1600, useNativeDriver: true }),
      ])
    ).start();
    // Logo: brilho
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoGlow, { toValue: 1,   duration: 1200, useNativeDriver: true }),
        Animated.timing(logoGlow, { toValue: 0.3, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
    // Glitch periódico no título
    const glitch = () => {
      Animated.sequence([
        Animated.timing(glitchOp, { toValue: 0.5, duration: 40,  useNativeDriver: true }),
        Animated.timing(glitchX,  { toValue: 4,   duration: 40,  useNativeDriver: true }),
        Animated.timing(glitchOp, { toValue: 1,   duration: 40,  useNativeDriver: true }),
        Animated.timing(glitchX,  { toValue: -3,  duration: 40,  useNativeDriver: true }),
        Animated.timing(glitchX,  { toValue: 0,   duration: 60,  useNativeDriver: true }),
      ]).start();
    };
    const id = setInterval(glitch, 3500);
    // Linha de scan
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanY, { toValue: SCREEN_H + 4, duration: 2800, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(scanY, { toValue: -4, duration: 0, useNativeDriver: true }),
      ])
    ).start();
    return () => clearInterval(id);
  }, []);

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(errorShake, { toValue: 10,  duration: 55, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: -10, duration: 55, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: 7,   duration: 55, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: -7,  duration: 55, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: 0,   duration: 55, useNativeDriver: true }),
    ]).start();
  };

  const clearField = (key: string) =>
    setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim())     e.name     = 'Nome é obrigatório.';
    if (!email.trim())    e.email    = 'E-mail é obrigatório.';
    else if (!isValidEmail(email)) e.email = 'E-mail inválido — verifique o @.';
    if (!password)        e.password = 'Senha é obrigatória.';
    else if (password.length < 6)  e.password = 'Mínimo de 6 caracteres.';
    if (!confirmPassword) e.confirm  = 'Confirme sua senha.';
    else if (confirmPassword !== password) e.confirm = 'As senhas não coincidem.';
    setErrors(e);
    if (Object.keys(e).length > 0) triggerShake();
    return Object.keys(e).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
      setSuccess(true);
    } catch (err: any) {
      setErrors({ general: parseError(err) });
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const linkHover = useRef(new Animated.Value(0)).current;
  const linkWeb   = Platform.OS === 'web'
    ? {
        onMouseEnter: () => Animated.timing(linkHover, { toValue: 1, duration: 150, useNativeDriver: true }).start(),
        onMouseLeave: () => Animated.timing(linkHover, { toValue: 0, duration: 220, useNativeDriver: true }).start(),
      }
    : {};

  const spin = logoRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const strength = strengthLevel(password);

  return (
    <SafeAreaView style={s.safe}>
      {/* Partículas de fundo */}
      <Particle x="8%"  y={80}  size={4} duration={2200} />
      <Particle x="88%" y={140} size={3} duration={3100} />
      <Particle x="15%" y={320} size={5} duration={1800} />
      <Particle x="75%" y={500} size={3} duration={2600} />
      <Particle x="50%" y={650} size={4} duration={2000} />
      <Particle x="92%" y={380} size={3} duration={3400} />

      {/* Linha de scan */}
      <Animated.View style={[s.scanLine, { transform: [{ translateY: scanY }] }]} pointerEvents="none" />

      {/* Brilho de fundo */}
      <View style={s.glowBg} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.container}
      >
        {/* Header com logo animada */}
        <View style={s.header}>
          <Animated.Text style={[s.logoIcon, { transform: [{ rotate: spin }, { scale: logoScale }], opacity: logoGlow }]}>
            ◈
          </Animated.Text>
          <Animated.Text style={[s.title, { transform: [{ translateX: glitchX }], opacity: glitchOp }]}>
            TASK OS
          </Animated.Text>
          <Text style={s.subtitle}>Novo Registro de Usuário</Text>
        </View>

        {/* Card do formulário */}
        <View style={s.card}>
          <Text style={s.cardTitle}>CADASTRO</Text>

          <Field label="NOME" error={errors.name}>
            <TextInput
              style={[s.input, !!name && s.inputActive, !!errors.name && s.inputError]}
              placeholder="Seu nome completo"
              placeholderTextColor="#252540"
              autoCapitalize="words"
              value={name}
              onChangeText={(v) => { setName(v); clearField('name'); }}
            />
          </Field>

          <Field label="E-MAIL" error={errors.email}>
            <TextInput
              style={[s.input, !!email && s.inputActive, !!errors.email && s.inputError]}
              placeholder="usuario@email.com"
              placeholderTextColor="#252540"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={(v) => { setEmail(v); clearField('email'); }}
            />
          </Field>

          <Field label="SENHA" error={errors.password}>
            <TextInput
              style={[s.input, !!password && s.inputActive, !!errors.password && s.inputError]}
              placeholder="mínimo 6 caracteres"
              placeholderTextColor="#252540"
              secureTextEntry
              value={password}
              onChangeText={(v) => { setPassword(v); clearField('password'); }}
            />
            {password.length > 0 && (
              <View style={s.strengthRow}>
                {[1, 2, 3].map((i) => (
                  <View key={i} style={[s.strengthBar, { backgroundColor: strength >= i ? STRENGTH_COLORS[strength] : '#1e1e3f' }]} />
                ))}
                <Text style={[s.strengthLabel, { color: STRENGTH_COLORS[strength] }]}>
                  {STRENGTH_LABELS[strength]}
                </Text>
              </View>
            )}
          </Field>

          <Field label="CONFIRMAR SENHA" error={errors.confirm}>
            <View style={s.confirmRow}>
              <TextInput
                style={[
                  s.input, s.inputFlex,
                  !!confirmPassword && s.inputActive,
                  !!errors.confirm && s.inputError,
                  confirmPassword && confirmPassword === password ? s.inputMatch : null,
                ]}
                placeholder="repita a senha"
                placeholderTextColor="#252540"
                secureTextEntry
                value={confirmPassword}
                onChangeText={(v) => { setConfirmPassword(v); clearField('confirm'); }}
              />
              {confirmPassword.length > 0 && (
                <Text style={[s.matchIcon, { color: confirmPassword === password ? '#00ff88' : '#ff4466' }]}>
                  {confirmPassword === password ? '✓' : '✗'}
                </Text>
              )}
            </View>
          </Field>

          {/* Erro geral com shake */}
          {errors.general ? (
            <Animated.View style={[s.errorBox, { transform: [{ translateX: errorShake }] }]}>
              <Text style={s.errorIcon}>⚠</Text>
              <Text style={s.errorText}>{errors.general}</Text>
            </Animated.View>
          ) : null}

          <GlowButton onPress={handleSignup} loading={loading} disabled={loading} />
        </View>

        <View style={[s.link, { borderRadius: 8, overflow: 'hidden' }]} {...linkWeb}>
          <Animated.View
            style={[StyleSheet.absoluteFillObject, { opacity: linkHover, backgroundColor: 'rgba(0,212,255,0.07)' }]}
            pointerEvents="none"
          />
          <Pressable onPress={() => router.push('/login')} style={{ paddingVertical: 6, paddingHorizontal: 12, alignItems: 'center' }}>
            <Text style={s.linkText}>
              Já tem uma conta?{'  '}
              <Text style={s.linkHighlight}>ENTRAR</Text>
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {success && <SuccessOverlay onDone={() => router.replace('/login')} />}
    </SafeAreaView>
  );
}

// ─── Campo com label e erro ──────────────────────────────────────────────────────
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <View style={s.fieldGroup}>
      <Text style={s.label}>{label}</Text>
      {children}
      {error ? <Text style={s.fieldError}>⚠ {error}</Text> : null}
    </View>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#050510' },
  glowBg: {
    position: 'absolute', top: -80, left: '50%', marginLeft: -180,
    width: 360, height: 360, borderRadius: 180,
    backgroundColor: 'rgba(124, 58, 237, 0.06)',
  },
  scanLine: {
    position: 'absolute', left: 0, right: 0, height: 2,
    backgroundColor: 'rgba(0, 212, 255, 0.12)',
    zIndex: 999,
  },
  container: {
    flex: 1, paddingHorizontal: 24, justifyContent: 'center',
    maxWidth: 480, width: '100%', alignSelf: 'center',
  },
  header: { alignItems: 'center', marginBottom: 24 },
  logoIcon: {
    fontSize: 36, color: '#7c3aed',
    textShadowColor: '#7c3aed', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20,
    marginBottom: 8,
  },
  title: {
    fontSize: 26, fontWeight: '900', color: '#7c3aed', letterSpacing: 10,
    textShadowColor: '#7c3aed', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12,
  },
  subtitle: { color: '#333355', fontSize: 10, letterSpacing: 3, marginTop: 4 },
  card: {
    backgroundColor: '#0a0a1a', borderRadius: 14,
    borderWidth: 1, borderColor: '#1a1a35', padding: 20,
    shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 8,
  },
  cardTitle: { color: '#00d4ff', fontSize: 10, fontWeight: '700', letterSpacing: 4, marginBottom: 16 },
  fieldGroup: { marginBottom: 12 },
  label: { color: '#333355', fontSize: 9, fontWeight: '700', letterSpacing: 3, marginBottom: 5 },
  input: {
    backgroundColor: '#08081a', borderWidth: 1, borderColor: '#1a1a35',
    borderRadius: 8, paddingVertical: 11, paddingHorizontal: 14,
    fontSize: 14, color: '#e0e0ff',
  },
  inputFlex: { flex: 1 },
  inputActive: { borderColor: '#7c3aed' },
  inputError:  { borderColor: '#ff4466' },
  inputMatch:  { borderColor: '#00ff88' },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  matchIcon: { fontSize: 20, fontWeight: '900' },
  fieldError: { color: '#ff4466', fontSize: 11, marginTop: 4 },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  strengthBar: { flex: 1, height: 3, borderRadius: 2 },
  strengthLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 2, marginLeft: 4, minWidth: 40 },
  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(255,68,102,0.1)', borderWidth: 1, borderColor: '#ff4466',
    borderRadius: 8, padding: 12, marginBottom: 12,
  },
  errorIcon: { fontSize: 14, color: '#ff4466' },
  errorText: { color: '#ff4466', fontSize: 12, flex: 1, lineHeight: 18 },
  button: {
    backgroundColor: '#7c3aed', paddingVertical: 14, borderRadius: 8,
    alignItems: 'center', marginTop: 6, overflow: 'hidden',
    shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 16, elevation: 8,
  },
  buttonLoading: { backgroundColor: '#3d1f74', shadowOpacity: 0 },
  buttonGlow: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  buttonText: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 3, zIndex: 1 },
  link: { marginTop: 20, alignItems: 'center' },
  linkText: { color: '#333355', fontSize: 12, letterSpacing: 1 },
  linkHighlight: { color: '#00d4ff', fontWeight: '700', letterSpacing: 2 },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,5,16,0.96)', justifyContent: 'center', alignItems: 'center',
  },
  successCard: {
    alignItems: 'center', backgroundColor: '#0a0a1a',
    borderRadius: 20, borderWidth: 1, borderColor: '#00ff88', padding: 44,
    shadowColor: '#00ff88', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 30, elevation: 12,
  },
  successRing: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    borderWidth: 1, borderColor: 'rgba(0,255,136,0.3)',
  },
  successIcon:  { fontSize: 52, color: '#00ff88', marginBottom: 16 },
  successTitle: { fontSize: 20, fontWeight: '900', color: '#00ff88', letterSpacing: 6 },
  successSub:   { color: '#333355', fontSize: 11, letterSpacing: 2, marginTop: 8 },
});
