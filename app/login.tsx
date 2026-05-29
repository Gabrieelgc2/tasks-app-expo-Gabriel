import { useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, KeyboardAvoidingView, Platform, Pressable,
  SafeAreaView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/useAuthStore';

const { height: SCREEN_H } = Dimensions.get('window');

export default function LoginScreen() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const login  = useAuthStore((state) => state.login);
  const router = useRouter();

  const btnScale   = useRef(new Animated.Value(1)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const logoScale  = useRef(new Animated.Value(1)).current;
  const logoGlow   = useRef(new Animated.Value(0.4)).current;
  const glitchX    = useRef(new Animated.Value(0)).current;
  const glitchOp   = useRef(new Animated.Value(1)).current;
  const scanY      = useRef(new Animated.Value(-4)).current;
  const errorShake = useRef(new Animated.Value(0)).current;

  const [glowPos, setGlowPos] = useState({ x: 0, y: 0 });
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(logoRotate, { toValue: 1, duration: 9000, useNativeDriver: true })
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoScale, { toValue: 1.12, duration: 1600, useNativeDriver: true }),
        Animated.timing(logoScale, { toValue: 1,    duration: 1600, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoGlow, { toValue: 1,   duration: 1200, useNativeDriver: true }),
        Animated.timing(logoGlow, { toValue: 0.3, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
    const glitch = () => {
      Animated.sequence([
        Animated.timing(glitchOp, { toValue: 0.5, duration: 40, useNativeDriver: true }),
        Animated.timing(glitchX,  { toValue: 4,   duration: 40, useNativeDriver: true }),
        Animated.timing(glitchOp, { toValue: 1,   duration: 40, useNativeDriver: true }),
        Animated.timing(glitchX,  { toValue: -3,  duration: 40, useNativeDriver: true }),
        Animated.timing(glitchX,  { toValue: 0,   duration: 60, useNativeDriver: true }),
      ]).start();
    };
    const id = setInterval(glitch, 4000);
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanY, { toValue: SCREEN_H + 4, duration: 2800, useNativeDriver: true }),
        Animated.delay(2500),
        Animated.timing(scanY, { toValue: -4, duration: 0, useNativeDriver: true }),
      ])
    ).start();
    return () => clearInterval(id);
  }, []);

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(errorShake, { toValue: 10,  duration: 55, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: -10, duration: 55, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: 6,   duration: 55, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: -6,  duration: 55, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: 0,   duration: 55, useNativeDriver: true }),
    ]).start();
  };

  const spring = (to: number) =>
    Animated.spring(btnScale, { toValue: to, useNativeDriver: true, speed: 20 }).start();

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Preencha e-mail e senha.');
      triggerShake();
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      const serverMsg: string = err?.response?.data?.error ?? err?.response?.data?.message ?? '';
      const msg = serverMsg
        ? (serverMsg.toLowerCase().includes('inválid') ? 'E-mail ou senha incorretos.' : serverMsg)
        : err?.message === 'Network Error'
          ? 'Servidor offline. Certifique-se de que o backend está rodando na porta 5000.'
          : 'Erro ao entrar. Tente novamente.';
      setError(msg);
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const webBtnEvents = Platform.OS === 'web' ? {
    onMouseEnter: () => Animated.timing(glowOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start(),
    onMouseLeave: () => Animated.timing(glowOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(),
    onMouseMove:  (e: any) => setGlowPos({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY }),
  } : {};

  const linkHover = useRef(new Animated.Value(0)).current;
  const linkWeb   = Platform.OS === 'web'
    ? {
        onMouseEnter: () => Animated.timing(linkHover, { toValue: 1, duration: 150, useNativeDriver: true }).start(),
        onMouseLeave: () => Animated.timing(linkHover, { toValue: 0, duration: 220, useNativeDriver: true }).start(),
      }
    : {};

  const spin = logoRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <SafeAreaView style={s.safe}>
      {/* Scan line */}
      <Animated.View style={[s.scanLine, { transform: [{ translateY: scanY }] }]} pointerEvents="none" />
      {/* Brilho de fundo */}
      <View style={s.glowBg} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.container}
      >
        <View style={s.header}>
          <Animated.Text style={[s.logoIcon, { transform: [{ rotate: spin }, { scale: logoScale }], opacity: logoGlow }]}>
            ⬡
          </Animated.Text>
          <Animated.Text style={[s.title, { transform: [{ translateX: glitchX }], opacity: glitchOp }]}>
            TASK OS
          </Animated.Text>
          <Text style={s.subtitle}>Sistema de Autenticação</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>ACESSO</Text>

          <View style={s.fieldGroup}>
            <Text style={s.label}>E-MAIL</Text>
            <TextInput
              style={[s.input, !!email && s.inputActive]}
              placeholder="usuario@email.com"
              placeholderTextColor="#252540"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={(v) => { setEmail(v); setError(''); }}
            />
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.label}>SENHA</Text>
            <TextInput
              style={[s.input, !!password && s.inputActive]}
              placeholder="••••••••"
              placeholderTextColor="#252540"
              secureTextEntry
              value={password}
              onChangeText={(v) => { setPassword(v); setError(''); }}
            />
          </View>

          {error ? (
            <Animated.View style={[s.errorBox, { transform: [{ translateX: errorShake }] }]}>
              <Text style={s.errorIcon}>⚠</Text>
              <Text style={s.errorText}>{error}</Text>
            </Animated.View>
          ) : null}

          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <Pressable
              style={[s.button, loading && s.buttonLoading]}
              onPressIn={() => spring(0.96)}
              onPressOut={() => spring(1)}
              onPress={handleLogin}
              disabled={loading}
              {...webBtnEvents}
            >
              <Animated.View
                style={[s.buttonGlow, { opacity: glowOpacity, left: glowPos.x - 70, top: glowPos.y - 70 }]}
                pointerEvents="none"
              />
              <Text style={s.buttonText}>{loading ? 'VERIFICANDO...' : 'ENTRAR  →'}</Text>
            </Pressable>
          </Animated.View>
        </View>

        <View style={[s.link, { borderRadius: 8, overflow: 'hidden' }]} {...linkWeb}>
          <Animated.View
            style={[StyleSheet.absoluteFillObject, { opacity: linkHover }]}
            pointerEvents="none"
          />
          <Pressable onPress={() => router.push('/signup')} style={{ paddingVertical: 6, paddingHorizontal: 12, alignItems: 'center' }}>
            <Text>
              Não tem acesso?{'  '}
              <Text>CRIAR CONTA</Text>
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#100705' },
  glowBg: {
    position: 'absolute', top: -80, left: '50%', marginLeft: -180,
    width: 360, height: 360, borderRadius: 180,
    backgroundColor: 'rgba(0, 212, 255, 0.05)',
  },
  scanLine: {
    position: 'absolute', left: 0, right: 0, height: 2,
    backgroundColor: 'rgba(204, 0, 255, 0.12)', zIndex: 999,
  },
  container: {
    flex: 1, paddingHorizontal: 24, justifyContent: 'center',
    maxWidth: 480, width: '100%', alignSelf: 'center',
  },
  header: { alignItems: 'center', marginBottom: 32 },
  logoIcon: {
    fontSize: 40, color: '#ff0000',
    textShadowColor: '#ff004c', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20,
    marginBottom: 8,
  },
  title: {
    fontSize: 28, fontWeight: '900', color: '#e6e6e6', letterSpacing: 10,
    textShadowColor: '#00ff1a', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12,
  },
  subtitle: { color: '#ff0088', fontSize: 10, letterSpacing: 3, marginTop: 4 },
  card: {
    backgroundColor: '#6fff00', borderRadius: 14,
    borderWidth: 1, borderColor: '#ffea00', padding: 22,
    shadowColor: '#e5ff00', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 8,
  },
  cardTitle: { color: '#7c3aed', fontSize: 10, fontWeight: '700', letterSpacing: 4, marginBottom: 18 },
  fieldGroup: { marginBottom: 14 },
  label: { color: '#333355', fontSize: 9, fontWeight: '700', letterSpacing: 3, marginBottom: 6 },
  input: {
    backgroundColor: '#0000ff', borderWidth: 1, borderColor: '#1a1a35',
    borderRadius: 8, paddingVertical: 12, paddingHorizontal: 14,
    fontSize: 15, color: '#ff0000',
  },
  inputActive: { borderColor: '#00d4ff' },
  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(255,68,102,0.1)', borderWidth: 1, borderColor: '#ff4466',
    borderRadius: 8, padding: 12, marginBottom: 14,
  },
  errorIcon: { fontSize: 14, color: '#ff4466' },
  errorText: { color: '#ff4466', fontSize: 12, flex: 1, lineHeight: 18 },
  button: {
    backgroundColor: '#ff6325', paddingVertical: 15, borderRadius: 8,
    alignItems: 'center', marginTop: 6, overflow: 'hidden',
    shadowColor: '#3fff1d', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 16, elevation: 8,
  },
  buttonLoading: { backgroundColor: '#fffb00', shadowOpacity: 0 },
  buttonGlow: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgb(250, 0, 0)',
  },
  buttonText: { color: '#b8b8b8', fontWeight: '900', fontSize: 14, letterSpacing: 3, zIndex: 1 },
  link: { marginTop: 24, alignItems: 'center' },
  linkText: { color: '#0000fe', fontSize: 12, letterSpacing: 1 },
  linkHighlight: { color: '#5d00ff', fontWeight: '700', letterSpacing: 2 },
});
