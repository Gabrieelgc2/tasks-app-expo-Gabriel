import { useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, Modal, Platform, Pressable, SafeAreaView,
  StatusBar as RNStatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Checkbox from 'expo-checkbox';
import DateTimePicker from '@react-native-community/datetimepicker';
import TaskList from '../../src/components/TaskList';
import { addTask, deleteTask, getAllTasks, updateTask, TaskItem } from '../../src/utils/handle-api';

const { height: SCREEN_H } = Dimensions.get('window');

const PRIORITY_COLORS: Record<string, string> = {
  Baixa: '#00ff88',
  Média: '#ff9800',
  Alta:  '#ff4466',
};

function HoverBtn({
  children, style, onPress, hoverColor = 'rgba(0,212,255,0.12)',
  disabled,
}: {
  children: React.ReactNode;
  style?: any;
  onPress?: () => void;
  hoverColor?: string;
  disabled?: boolean;
}) {
  const hoverOp  = useRef(new Animated.Value(0)).current;
  const pressScl = useRef(new Animated.Value(1)).current;
  const hIn  = () => Animated.timing(hoverOp,  { toValue: 1, duration: 150, useNativeDriver: true }).start();
  const hOut = () => Animated.timing(hoverOp,  { toValue: 0, duration: 220, useNativeDriver: true }).start();
  const pIn  = () => Animated.spring(pressScl, { toValue: 0.96, useNativeDriver: true, speed: 30 }).start();
  const pOut = () => Animated.spring(pressScl, { toValue: 1,    useNativeDriver: true, speed: 30 }).start();
  const web  = Platform.OS === 'web' ? { onMouseEnter: hIn, onMouseLeave: hOut } : {};
  return (
    <Animated.View style={{ transform: [{ scale: pressScl }] }}>
      <Pressable
        style={[style, { overflow: 'hidden' }]}
        onPress={onPress}
        onPressIn={pIn}
        onPressOut={pOut}
        disabled={disabled}
        {...web}
      >
        <Animated.View
          style={[StyleSheet.absoluteFillObject, { opacity: hoverOp, backgroundColor: hoverColor }]}
          pointerEvents="none"
        />
        {children}
      </Pressable>
    </Animated.View>
  );
}

export default function TasksScreen() {
  const [tasks,    setTasks]    = useState<TaskItem[]>([]);
  const [text,     setText]     = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [taskId,   setTaskId]   = useState('');
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<'all' | 'completed' | 'pending'>('all');
  const [modalVisible,      setModalVisible]      = useState(false);
  const [completed,         setCompleted]         = useState(false);
  const [dueDate,           setDueDate]           = useState<Date | null>(null);
  const [showDatePicker,    setShowDatePicker]    = useState(false);
  const [priority,          setPriority]          = useState<'Baixa' | 'Média' | 'Alta'>('Baixa');

  const scanY      = useRef(new Animated.Value(-4)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const logoGlow   = useRef(new Animated.Value(0.4)).current;
  const modalScale = useRef(new Animated.Value(0.92)).current;
  const modalOp    = useRef(new Animated.Value(0)).current;

  // Filter pill hovers
  const fHoverAll  = useRef(new Animated.Value(0)).current;
  const fHoverDone = useRef(new Animated.Value(0)).current;
  const fHoverPend = useRef(new Animated.Value(0)).current;
  const filterHovers: Record<string, Animated.Value> = {
    all: fHoverAll, completed: fHoverDone, pending: fHoverPend,
  };

  // Priority button hovers
  const prHoverB = useRef(new Animated.Value(0)).current;
  const prHoverM = useRef(new Animated.Value(0)).current;
  const prHoverA = useRef(new Animated.Value(0)).current;
  const priorityHovers: Record<string, Animated.Value> = {
    Baixa: prHoverB, Média: prHoverM, Alta: prHoverA,
  };

  useEffect(() => {
    getAllTasks(setTasks, setLoading);

    Animated.loop(
      Animated.sequence([
        Animated.timing(scanY, { toValue: SCREEN_H + 4, duration: 3000, useNativeDriver: true }),
        Animated.delay(3000),
        Animated.timing(scanY, { toValue: -4, duration: 0, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(logoRotate, { toValue: 1, duration: 10000, useNativeDriver: true })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(logoGlow, { toValue: 1,   duration: 1400, useNativeDriver: true }),
        Animated.timing(logoGlow, { toValue: 0.3, duration: 1400, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const openModal = () => {
    setModalVisible(true);
    Animated.parallel([
      Animated.spring(modalScale, { toValue: 1, useNativeDriver: true, speed: 14 }),
      Animated.timing(modalOp,    { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(modalScale, { toValue: 0.92, duration: 160, useNativeDriver: true }),
      Animated.timing(modalOp,    { toValue: 0,    duration: 160, useNativeDriver: true }),
    ]).start(() => {
      setModalVisible(false);
      resetForm();
    });
  };

  const resetForm = () => {
    setText(''); setCompleted(false); setDueDate(null);
    setPriority('Baixa'); setIsUpdating(false); setTaskId('');
  };

  const updateMode = (task: TaskItem) => {
    setIsUpdating(true); setTaskId(task._id); setText(task.text);
    setCompleted(!!task.completed);
    setDueDate(task.dueDate ? new Date(task.dueDate) : null);
    openModal();
  };

  const handleSave = () => {
    const formattedDate = dueDate ? dueDate.toISOString() : null;
    if (isUpdating) updateTask(taskId, text, completed, formattedDate, setTasks, closeModal);
    else            addTask(text, completed, formattedDate, setTasks, closeModal);
  };

  const spin = logoRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const filtered = tasks.filter((t) => {
    if (filter === 'completed') return t.completed;
    if (filter === 'pending')   return !t.completed;
    return true;
  });

  const pending    = tasks.filter((t) => !t.completed).length;
  const completed_ = tasks.filter((t) =>  t.completed).length;

  const makeHoverHandlers = (anim: Animated.Value) =>
    Platform.OS === 'web'
      ? {
          onMouseEnter: () => Animated.timing(anim, { toValue: 1, duration: 140, useNativeDriver: true }).start(),
          onMouseLeave: () => Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(),
        }
      : {};

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="light" />

      <Animated.View style={[s.scanLine, { transform: [{ translateY: scanY }] }]} pointerEvents="none" />
      <View style={s.glowBg} />

      <View style={s.container}>

        {/* Header */}
        <View style={s.header}>
          <Animated.Text style={[s.logoIcon, { transform: [{ rotate: spin }], opacity: logoGlow }]}>
            ⬡
          </Animated.Text>
          <Text style={s.title}>TASK OS</Text>
          <Text style={s.subtitle}>Gerenciador de Tarefas</Text>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statNum}>{tasks.length}</Text>
            <Text style={s.statLabel}>TOTAL</Text>
          </View>
          <View style={[s.statCard, s.statCardAccent]}>
            <Text style={[s.statNum, { color: '#00ff88' }]}>{completed_}</Text>
            <Text style={s.statLabel}>CONCLUÍDAS</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statNum, { color: '#ff9800' }]}>{pending}</Text>
            <Text style={s.statLabel}>PENDENTES</Text>
          </View>
        </View>

        {/* Filtros */}
        <View style={s.filterRow}>
          {([
            { key: 'all',       label: 'TODAS' },
            { key: 'completed', label: 'CONCLUÍDAS' },
            { key: 'pending',   label: 'PENDENTES' },
          ] as const).map(({ key, label }) => (
            <View
              key={key}
              style={[s.filterBtn, filter === key && s.filterBtnActive, { overflow: 'hidden' }]}
              {...makeHoverHandlers(filterHovers[key])}
            >
              <Animated.View
                style={[StyleSheet.absoluteFillObject, { opacity: filterHovers[key], backgroundColor: 'rgba(0,212,255,0.1)' }]}
                pointerEvents="none"
              />
              <TouchableOpacity style={s.filterBtnInner} onPress={() => setFilter(key)}>
                <Text style={[s.filterText, filter === key && s.filterTextActive]}>{label}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Ações */}
        <View style={s.actionsRow}>
          <HoverBtn style={s.btnAdd} hoverColor="rgba(255,255,255,0.14)" onPress={openModal}>
            <Text style={[s.btnText, { color: '#000' }]}>＋ NOVA TAREFA</Text>
          </HoverBtn>
          <HoverBtn style={s.btnDelete} hoverColor="rgba(255,68,102,0.18)" onPress={() => setTasks([])}>
            <Text style={[s.btnText, { color: '#ff4466' }]}>⌫ EXCLUIR TODAS</Text>
          </HoverBtn>
        </View>

        {/* Lista */}
        <TaskList
          tasks={filtered}
          onUpdate={updateMode}
          onDelete={(id) => deleteTask(id, setTasks)}
        />

        {/* Loading overlay */}
        {loading && (
          <View style={s.loadingOverlay}>
            <View style={s.loadingCard}>
              <Animated.Text style={[s.loadingIcon, { transform: [{ rotate: spin }] }]}>⬡</Animated.Text>
              <Text style={s.loadingText}>CARREGANDO...</Text>
            </View>
          </View>
        )}
      </View>

      {/* Modal nova/editar tarefa */}
      <Modal visible={modalVisible} transparent animationType="none" onRequestClose={closeModal}>
        <View style={s.modalOverlay}>
          <Animated.View style={[s.modalCard, { transform: [{ scale: modalScale }], opacity: modalOp }]}>

            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{isUpdating ? 'EDITAR TAREFA' : 'NOVA TAREFA'}</Text>
              <HoverBtn style={s.modalCloseBtn} hoverColor="rgba(255,68,102,0.15)" onPress={closeModal}>
                <Text style={s.modalClose}>✕</Text>
              </HoverBtn>
            </View>

            <Text style={s.modalLabel}>NOME</Text>
            <TextInput
              style={[s.modalInput, !!text && s.modalInputActive]}
              placeholder="Descreva a tarefa..."
              placeholderTextColor="#252540"
              value={text}
              maxLength={50}
              onChangeText={setText}
            />

            <Text style={s.modalLabel}>DATA LIMITE</Text>
            {Platform.OS === 'web' ? (
              // @ts-ignore
              <input
                type="date"
                value={dueDate ? dueDate.toISOString().split('T')[0] : ''}
                onChange={(e: any) => {
                  const val = e.target.value;
                  if (val) {
                    const [y, m, d] = val.split('-');
                    setDueDate(new Date(+y, +m - 1, +d));
                  } else setDueDate(null);
                }}
                style={{
                  backgroundColor: '#08081a', border: '1px solid #1a1a35', borderRadius: 8,
                  padding: '10px 14px', color: '#e0e0ff', fontSize: 14,
                  marginBottom: 14, width: '100%', boxSizing: 'border-box',
                }}
              />
            ) : (
              <View style={s.dateRow}>
                <TouchableOpacity onPress={() => setShowDatePicker(true)} style={s.dateBtn}>
                  <Text style={s.dateBtnText}>{dueDate ? dueDate.toLocaleDateString() : 'Selecionar  ▾'}</Text>
                </TouchableOpacity>
                {dueDate && (
                  <TouchableOpacity onPress={() => setDueDate(null)} style={s.dateClear}>
                    <Text style={s.dateClearText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {showDatePicker && (
              <DateTimePicker
                value={dueDate || new Date()}
                mode="date"
                display="default"
                onChange={(_, d) => { setShowDatePicker(false); if (d) setDueDate(d); }}
              />
            )}

            <View style={s.rowField}>
              <Text style={s.modalLabel}>CONCLUÍDA</Text>
              <Checkbox
                value={completed}
                onValueChange={setCompleted}
                color={completed ? '#00d4ff' : undefined}
                style={{ marginLeft: 12 }}
              />
            </View>

            <Text style={s.modalLabel}>PRIORIDADE</Text>
            <View style={s.priorityRow}>
              {(['Baixa', 'Média', 'Alta'] as const).map((p) => (
                <View
                  key={p}
                  style={[
                    s.priorityBtn,
                    priority === p && { borderColor: PRIORITY_COLORS[p], backgroundColor: `${PRIORITY_COLORS[p]}18` },
                    { overflow: 'hidden' },
                  ]}
                  {...makeHoverHandlers(priorityHovers[p])}
                >
                  <Animated.View
                    style={[StyleSheet.absoluteFillObject, { opacity: priorityHovers[p], backgroundColor: `${PRIORITY_COLORS[p]}22` }]}
                    pointerEvents="none"
                  />
                  <TouchableOpacity style={s.priorityBtnInner} onPress={() => setPriority(p)}>
                    <Text style={[s.priorityText, priority === p && { color: PRIORITY_COLORS[p], fontWeight: '700' }]}>{p}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <View style={s.modalActions}>
              <HoverBtn style={s.cancelBtn} hoverColor="rgba(255,255,255,0.04)" onPress={closeModal}>
                <Text style={s.cancelText}>CANCELAR</Text>
              </HoverBtn>
              <HoverBtn
                style={[s.saveBtn, !text.trim() && s.saveBtnDisabled]}
                hoverColor="rgba(255,255,255,0.14)"
                onPress={handleSave}
                disabled={!text.trim()}
              >
                <Text style={s.saveText}>SALVAR</Text>
              </HoverBtn>
            </View>

          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1, backgroundColor: '#050510',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  glowBg: {
    position: 'absolute', top: -60, left: '50%', marginLeft: -180,
    width: 360, height: 360, borderRadius: 180,
    backgroundColor: 'rgba(0, 212, 255, 0.04)',
  },
  scanLine: {
    position: 'absolute', left: 0, right: 0, height: 2,
    backgroundColor: 'rgba(0, 212, 255, 0.1)', zIndex: 999,
  },
  container: {
    flex: 1, maxWidth: 620, width: '100%', alignSelf: 'center', paddingHorizontal: 18,
  },
  header: { alignItems: 'center', paddingTop: 16, marginBottom: 16 },
  logoIcon: {
    fontSize: 28, color: '#00d4ff', marginBottom: 4,
    textShadowColor: '#00d4ff', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16,
  },
  title: {
    fontSize: 22, fontWeight: '900', color: '#00d4ff', letterSpacing: 8,
    textShadowColor: '#00d4ff', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10,
  },
  subtitle: { color: '#333355', fontSize: 9, letterSpacing: 3, marginTop: 2 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statCard: {
    flex: 1, backgroundColor: '#0a0a1a', borderRadius: 10,
    borderWidth: 1, borderColor: '#1a1a35', paddingVertical: 10, alignItems: 'center',
  },
  statCardAccent: { borderColor: '#00ff8820' },
  statNum:   { fontSize: 22, fontWeight: '900', color: '#00d4ff' },
  statLabel: { fontSize: 8, fontWeight: '700', color: '#333355', letterSpacing: 2, marginTop: 2 },

  filterRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  filterBtn: {
    flex: 1, borderRadius: 8,
    borderWidth: 1, borderColor: '#1a1a35',
    backgroundColor: '#0a0a1a',
  },
  filterBtnInner: { paddingVertical: 7, alignItems: 'center' },
  filterBtnActive: { backgroundColor: '#00d4ff15', borderColor: '#00d4ff' },
  filterText:      { color: '#333355', fontSize: 9, fontWeight: '700', letterSpacing: 2 },
  filterTextActive:{ color: '#00d4ff', fontSize: 9, fontWeight: '700', letterSpacing: 2 },

  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  btnAdd: {
    flex: 1, paddingVertical: 13, borderRadius: 8, alignItems: 'center',
    backgroundColor: '#00d4ff',
    shadowColor: '#00d4ff', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  btnDelete: {
    flex: 1, paddingVertical: 13, borderRadius: 8, alignItems: 'center',
    backgroundColor: 'rgba(255,68,102,0.1)', borderWidth: 1, borderColor: '#ff4466',
    shadowColor: '#ff4466', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 8,
  },
  btnText: { fontWeight: '900', fontSize: 11, letterSpacing: 2 },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,5,16,0.85)',
    justifyContent: 'center', alignItems: 'center', zIndex: 100,
  },
  loadingCard: { alignItems: 'center' },
  loadingIcon: {
    fontSize: 48, color: '#00d4ff', marginBottom: 12,
    textShadowColor: '#00d4ff', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20,
  },
  loadingText: { color: '#333355', fontSize: 11, letterSpacing: 4 },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(5,5,16,0.88)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalCard: {
    width: '92%', maxWidth: 420, backgroundColor: '#0a0a1a',
    borderRadius: 14, borderWidth: 1, borderColor: '#1a1a35', padding: 22,
    shadowColor: '#00d4ff', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15, shadowRadius: 24, elevation: 10,
  },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  modalTitle:   { color: '#00d4ff', fontSize: 12, fontWeight: '900', letterSpacing: 4 },
  modalCloseBtn:{ borderRadius: 6, padding: 4 },
  modalClose:   { color: '#333355', fontSize: 18, fontWeight: '700' },
  modalLabel:   { color: '#333355', fontSize: 9, fontWeight: '700', letterSpacing: 3, marginBottom: 6 },
  modalInput: {
    backgroundColor: '#08081a', borderWidth: 1, borderColor: '#1a1a35',
    borderRadius: 8, paddingVertical: 11, paddingHorizontal: 14,
    fontSize: 14, color: '#e0e0ff', marginBottom: 14,
  },
  modalInputActive: { borderColor: '#00d4ff' },
  dateRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  dateBtn: {
    flex: 1, backgroundColor: '#08081a', borderWidth: 1, borderColor: '#1a1a35',
    borderRadius: 8, paddingVertical: 11, paddingHorizontal: 14,
  },
  dateBtnText:  { color: '#e0e0ff', fontSize: 14 },
  dateClear:    { padding: 10 },
  dateClearText:{ color: '#ff4466', fontSize: 16 },
  rowField:     { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  priorityRow:  { flexDirection: 'row', gap: 8, marginBottom: 18 },
  priorityBtn: {
    flex: 1, borderRadius: 8,
    borderWidth: 1, borderColor: '#1a1a35',
  },
  priorityBtnInner: { paddingVertical: 8, alignItems: 'center' },
  priorityText: { color: '#333355', fontSize: 12 },
  modalActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 8,
    borderWidth: 1, borderColor: '#1a1a35', alignItems: 'center',
  },
  cancelText: { color: '#333355', fontWeight: '700', fontSize: 12, letterSpacing: 2 },
  saveBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 8,
    backgroundColor: '#00d4ff', alignItems: 'center',
    shadowColor: '#00d4ff', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 10,
  },
  saveBtnDisabled: { backgroundColor: '#0a1a1f', shadowOpacity: 0 },
  saveText: { color: '#000', fontWeight: '900', fontSize: 12, letterSpacing: 3 },
});
