import { useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, Easing, Modal, Platform, Pressable,
  SafeAreaView, StatusBar as RNStatusBar, StyleSheet, Text, View,
} from 'react-native';
import { useAuthStore } from '../../src/store/useAuthStore';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');

function getEmailFromToken(token: string | null): string {
  if (!token) return 'Usuário';
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.email ?? 'Usuário';
  } catch { return 'Usuário'; }
}

// ─── Efeito de falta de energia ─────────────────────────────────────────────────
function PowerOutage({ onDone }: { onDone: () => void }) {
  const overlay   = useRef(new Animated.Value(0)).current;
  const lineOp    = useRef(new Animated.Value(0)).current;
  const lineScale = useRef(new Animated.Value(1)).current;
  const lineGlow  = useRef(new Animated.Value(0)).current;
  const staticOp  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Fase 1 — tela treme/pisca (ruído elétrico)
      Animated.timing(overlay, { toValue: 0.35, duration: 55,  useNativeDriver: true }),
      Animated.timing(overlay, { toValue: 0.05, duration: 45,  useNativeDriver: true }),
      Animated.timing(overlay, { toValue: 0.60, duration: 70,  useNativeDriver: true }),
      Animated.timing(overlay, { toValue: 0.10, duration: 45,  useNativeDriver: true }),
      Animated.timing(overlay, { toValue: 0.45, duration: 55,  useNativeDriver: true }),
      Animated.timing(overlay, { toValue: 0.05, duration: 40,  useNativeDriver: true }),
      Animated.timing(overlay, { toValue: 0.80, duration: 90,  useNativeDriver: true }),
      Animated.timing(overlay, { toValue: 0.10, duration: 55,  useNativeDriver: true }),
      // Fase 2 — apaga devagar
      Animated.timing(overlay, { toValue: 1, duration: 320,
        easing: Easing.in(Easing.quad), useNativeDriver: true }),
      // Fase 3 — linha CRT aparece no centro (efeito monitor desligando)
      Animated.parallel([
        Animated.timing(lineOp,   { toValue: 1,    duration: 80,  useNativeDriver: true }),
        Animated.timing(lineGlow, { toValue: 1,    duration: 80,  useNativeDriver: true }),
      ]),
      // Linha colapsa verticalmente
      Animated.timing(lineScale, { toValue: 0, duration: 380,
        easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(lineOp, { toValue: 0, duration: 120, useNativeDriver: true }),
      // Fase 4 — preto total + estática residual
      Animated.timing(staticOp, { toValue: 0.04, duration: 100, useNativeDriver: true }),
      Animated.delay(200),
      Animated.timing(staticOp, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.delay(900),
    ]).start(() => onDone());
  }, []);

  return (
    <View style={po.root} pointerEvents="none">
      {/* Escurecimento piscante */}
      <Animated.View style={[po.fill, { opacity: overlay, backgroundColor: '#000' }]} />
      {/* Linha CRT no centro */}
      <Animated.View style={[
        po.crtLine,
        { opacity: lineOp, transform: [{ scaleY: lineScale }] },
      ]} />
      {/* Estática residual (pontilhado) */}
      <Animated.View style={[po.fill, { opacity: staticOp, backgroundColor: '#fff' }]} />
    </View>
  );
}

const po = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, zIndex: 9998 },
  fill: { ...StyleSheet.absoluteFillObject },
  crtLine: {
    position: 'absolute',
    top: SCREEN_H / 2 - 2,
    left: 0,
    width: SCREEN_W,
    height: 4,
    backgroundColor: '#00d4ff',
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 16,
  },
});

// ─── Modal de confirmação ────────────────────────────────────────────────────────
function ConfirmModal({ visible, onCancel, onConfirm }: {
  visible: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  const scale = useRef(new Animated.Value(0.85)).current;
  const op    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 16 }),
        Animated.timing(op,    { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(0.85); op.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <View style={cm.overlay}>
        <Animated.View style={[cm.card, { transform: [{ scale }], opacity: op }]}>
          <Text style={cm.icon}>⏻</Text>
          <Text style={cm.title}>ENCERRAR SESSÃO?</Text>
          <Text style={cm.sub}>Você será desconectado e retornará à tela de login.</Text>
          <View style={cm.actions}>
            <HoverBtn style={cm.cancelBtn} onPress={onCancel} hoverColor="rgba(255,255,255,0.04)">
              <Text style={cm.cancelText}>CANCELAR</Text>
            </HoverBtn>
            <HoverBtn style={cm.logoutBtn} onPress={onConfirm} hoverColor="rgba(255,68,102,0.2)">
              <Text style={cm.logoutText}>SAIR  ⏻</Text>
            </HoverBtn>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const cm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(5,5,16,0.92)', justifyContent: 'center', alignItems: 'center' },
  card: {
    width: '86%', maxWidth: 360, backgroundColor: '#0a0a1a', borderRadius: 18,
    borderWidth: 1, borderColor: '#ff446640', padding: 32, alignItems: 'center',
    shadowColor: '#ff4466', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 30, elevation: 14,
  },
  icon: { fontSize: 44, color: '#ff4466', marginBottom: 16,
    textShadowColor: '#ff4466', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20 },
  title: { fontSize: 16, fontWeight: '900', color: '#ff4466', letterSpacing: 4, marginBottom: 12, textAlign: 'center' },
  sub:   { color: '#444466', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  actions: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, borderWidth: 1, borderColor: '#1a1a35', alignItems: 'center', overflow: 'hidden' },
  cancelText: { color: '#444466', fontWeight: '700', fontSize: 12, letterSpacing: 2 },
  logoutBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, backgroundColor: '#ff4466', alignItems: 'center', overflow: 'hidden',
    shadowColor: '#ff4466', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.5, shadowRadius: 10 },
  logoutText: { color: '#fff', fontWeight: '900', fontSize: 12, letterSpacing: 3 },
});

// ─── Botão com hover futurista reutilizável ──────────────────────────────────────
function HoverBtn({ children, style, onPress, hoverColor = 'rgba(0,212,255,0.08)', onPressIn, onPressOut }: {
  children: React.ReactNode; style?: any; onPress?: () => void;
  hoverColor?: string; onPressIn?: () => void; onPressOut?: () => void;
}) {
  const hoverOp = useRef(new Animated.Value(0)).current;
  const hIn  = () => Animated.timing(hoverOp, { toValue: 1, duration: 150, useNativeDriver: true }).start();
  const hOut = () => Animated.timing(hoverOp, { toValue: 0, duration: 220, useNativeDriver: true }).start();
  const web  = Platform.OS === 'web' ? { onMouseEnter: hIn, onMouseLeave: hOut } : {};

  return (
    <Pressable style={[style, { overflow: 'hidden' }]} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} {...web}>
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: hoverOp, backgroundColor: hoverColor }]} pointerEvents="none" />
      {children}
    </Pressable>
  );
}

// ─── Botão de logout principal ───────────────────────────────────────────────────
function LogoutButton({ onPress }: { onPress: () => void }) {
  const ring1    = useRef(new Animated.Value(1)).current;
  const ring2    = useRef(new Animated.Value(1)).current;
  const glow     = useRef(new Animated.Value(0.25)).current;
  const iconRot  = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const hoverOp  = useRef(new Animated.Value(0)).current;
  const [glowPos, setGlowPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(ring1, { toValue: 1.22, duration: 1300, useNativeDriver: true }),
      Animated.timing(ring1, { toValue: 1,    duration: 1300, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.delay(650),
      Animated.timing(ring2, { toValue: 1.12, duration: 1300, useNativeDriver: true }),
      Animated.timing(ring2, { toValue: 1,    duration: 1300, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(glow,  { toValue: 0.7, duration: 1500, useNativeDriver: true }),
      Animated.timing(glow,  { toValue: 0.2, duration: 1500, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(iconRot, { toValue:  0.03, duration: 900, useNativeDriver: true }),
      Animated.timing(iconRot, { toValue: -0.03, duration: 900, useNativeDriver: true }),
    ])).start();
  }, []);

  const spring = (to: number) =>
    Animated.spring(btnScale, { toValue: to, useNativeDriver: true, speed: 22 }).start();

  const hIn  = () => Animated.timing(hoverOp, { toValue: 1, duration: 150, useNativeDriver: true }).start();
  const hOut = () => Animated.timing(hoverOp, { toValue: 0, duration: 220, useNativeDriver: true }).start();
  const web  = Platform.OS === 'web' ? {
    onMouseEnter: hIn, onMouseLeave: hOut,
    onMouseMove: (e: any) => setGlowPos({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY }),
  } : {};

  const rot = iconRot.interpolate({ inputRange: [-1, 1], outputRange: ['-30deg', '30deg'] });

  return (
    <View style={lb.wrap}>
      <Animated.View style={[lb.ring, lb.ring1, { transform: [{ scale: ring1 }], opacity: glow }]} />
      <Animated.View style={[lb.ring, lb.ring2, { transform: [{ scale: ring2 }], opacity: glow }]} />
      <Animated.View style={{ transform: [{ scale: btnScale }] }}>
        <Pressable style={lb.btn} onPressIn={() => spring(0.93)} onPressOut={() => spring(1)} onPress={onPress} {...web}>
          {/* Mouse-follow glow */}
          <Animated.View style={[lb.mouseGlow, { opacity: hoverOp, left: glowPos.x - 90, top: glowPos.y - 90 }]} pointerEvents="none" />
          {/* Hover overlay */}
          <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: hoverOp, backgroundColor: 'rgba(255,68,102,0.08)' }]} pointerEvents="none" />
          <Animated.Text style={[lb.icon, { transform: [{ rotate: rot }] }]}>⏻</Animated.Text>
          <Text style={lb.label}>ENCERRAR SESSÃO</Text>
          <Text style={lb.sub}>Pressione para sair da conta</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const lb = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end', paddingBottom: 36, alignItems: 'center' },
  ring: { position: 'absolute', borderRadius: 999, borderWidth: 1 },
  ring1: { width: '108%', aspectRatio: 1, borderColor: 'rgba(255,68,102,0.28)' },
  ring2: { width: '94%',  aspectRatio: 1, borderColor: 'rgba(255,68,102,0.14)' },
  btn: {
    backgroundColor: 'rgba(255,68,102,0.07)', borderWidth: 1.5, borderColor: '#ff4466',
    borderRadius: 16, paddingVertical: 26, paddingHorizontal: 52, alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#ff4466', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 28, elevation: 14,
  },
  mouseGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,68,102,0.12)' },
  icon: { fontSize: 42, color: '#ff4466', marginBottom: 10,
    textShadowColor: '#ff4466', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 22 },
  label: { color: '#ff4466', fontSize: 15, fontWeight: '900', letterSpacing: 4 },
  sub:   { color: '#663344', fontSize: 10, letterSpacing: 2, marginTop: 5 },
});

// ─── Tela principal ──────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const logout  = useAuthStore((state) => state.logout);
  const token   = useAuthStore((state) => state.token);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [powering,       setPowering]       = useState(false);

  const email   = getEmailFromToken(token);
  const initial = email.charAt(0).toUpperCase();
  const maskedToken = token ? `${token.slice(0, 14)}...${token.slice(-5)}` : '—';

  const scanY   = useRef(new Animated.Value(-4)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(scanY, { toValue: SCREEN_H + 4, duration: 3200, useNativeDriver: true }),
      Animated.delay(3500),
      Animated.timing(scanY, { toValue: -4, duration: 0, useNativeDriver: true }),
    ])).start();
  }, []);

  const handleConfirmLogout = () => {
    setConfirmVisible(false);
    // Pequeno delay para o modal fechar antes do efeito
    setTimeout(() => setPowering(true), 150);
  };

  return (
    <SafeAreaView style={s.safe}>
      <Animated.View style={[s.scanLine, { transform: [{ translateY: scanY }] }]} pointerEvents="none" />
      <View style={s.glowBg} />

      <View style={s.container}>
        <Text style={s.pageTitle}>CONFIGURAÇÕES</Text>

        {/* Perfil */}
        <View style={s.profileCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initial}</Text>
          </View>
          <View style={s.profileInfo}>
            <Text style={s.profileEmail} numberOfLines={1}>{email}</Text>
            <View style={s.onlineBadge}>
              <View style={s.onlineDot} />
              <Text style={s.onlineLabel}>SESSÃO ATIVA</Text>
            </View>
          </View>
        </View>

        {/* Token */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>TOKEN DE ACESSO</Text>
          <View style={s.tokenCard}>
            <Text style={s.tokenText} numberOfLines={1}>{maskedToken}</Text>
          </View>
        </View>

        {/* Sistema */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>SISTEMA</Text>
          <View style={s.infoCard}>
            {[
              { label: 'Plataforma', value: Platform.OS.toUpperCase() },
              { label: 'Versão',     value: '1.0.0' },
              { label: 'Status',     value: '● ONLINE', highlight: true },
            ].map((row, i, arr) => (
              <View key={row.label}>
                <HoverBtn style={s.infoRow} hoverColor="rgba(0,212,255,0.04)">
                  <Text style={s.infoLabel}>{row.label}</Text>
                  <Text style={[s.infoValue, row.highlight && { color: '#00ff88' }]}>{row.value}</Text>
                </HoverBtn>
                {i < arr.length - 1 && <View style={s.divider} />}
              </View>
            ))}
          </View>
        </View>

        <LogoutButton onPress={() => setConfirmVisible(true)} />
      </View>

      <ConfirmModal
        visible={confirmVisible}
        onCancel={() => setConfirmVisible(false)}
        onConfirm={handleConfirmLogout}
      />

      {/* Efeito de falta de energia */}
      {powering && <PowerOutage onDone={logout} />}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#050510', paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0 },
  glowBg: { position: 'absolute', bottom: 0, left: '50%', marginLeft: -200, width: 400, height: 400, borderRadius: 200, backgroundColor: 'rgba(255,68,102,0.04)' },
  scanLine: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: 'rgba(0,212,255,0.1)', zIndex: 999 },
  container: { flex: 1, paddingHorizontal: 22, paddingTop: 24 },
  pageTitle: { fontSize: 11, fontWeight: '900', color: '#00d4ff', letterSpacing: 6, marginBottom: 24 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#0a0a1a', borderRadius: 14, borderWidth: 1, borderColor: '#1a1a35', padding: 18, marginBottom: 20 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#7c3aed20', borderWidth: 2, borderColor: '#7c3aed', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 22, fontWeight: '900', color: '#7c3aed' },
  profileInfo: { flex: 1 },
  profileEmail: { color: '#e0e0ff', fontSize: 14, fontWeight: '600', marginBottom: 6 },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#00ff88', shadowColor: '#00ff88', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 5 },
  onlineLabel: { color: '#00ff88', fontSize: 9, fontWeight: '700', letterSpacing: 2 },
  section: { marginBottom: 20 },
  sectionLabel: { color: '#333355', fontSize: 9, fontWeight: '700', letterSpacing: 3, marginBottom: 8 },
  tokenCard: { backgroundColor: '#0a0a1a', borderRadius: 10, borderWidth: 1, borderColor: '#1a1a35', padding: 14 },
  tokenText: { color: '#333355', fontSize: 12, fontFamily: 'monospace' },
  infoCard: { backgroundColor: '#0a0a1a', borderRadius: 10, borderWidth: 1, borderColor: '#1a1a35', overflow: 'hidden' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16 },
  divider: { height: 1, backgroundColor: '#1a1a35' },
  infoLabel: { color: '#444466', fontSize: 13 },
  infoValue: { color: '#7c7c9a', fontSize: 13, fontWeight: '600' },
});
