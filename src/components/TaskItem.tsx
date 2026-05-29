import React, { useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather, AntDesign } from '@expo/vector-icons';
import { TaskItem as TaskType } from '../utils/handle-api';

interface TaskItemProps {
  task: TaskType;
  updateMode: () => void;
  deleteTask: () => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  Alta:  '#ff4466',
  Média: '#ff9800',
  Baixa: '#00ff88',
};

const TaskItem: React.FC<TaskItemProps> = ({ task, updateMode, deleteTask }) => {
  const isOverdue    = task.dueDate && new Date(task.dueDate) < new Date(new Date().setHours(0, 0, 0, 0));
  const priorityColor = task.priority ? PRIORITY_COLORS[task.priority] : null;

  // Hover no card
  const cardHover = useRef(new Animated.Value(0)).current;
  const hIn  = () => Animated.timing(cardHover, { toValue: 1, duration: 160, useNativeDriver: true }).start();
  const hOut = () => Animated.timing(cardHover, { toValue: 0, duration: 220, useNativeDriver: true }).start();
  const cardWeb = Platform.OS === 'web' ? { onMouseEnter: hIn, onMouseLeave: hOut } : {};

  // Hover no botão editar
  const editHover = useRef(new Animated.Value(0)).current;
  const eIn  = () => Animated.timing(editHover, { toValue: 1, duration: 140, useNativeDriver: true }).start();
  const eOut = () => Animated.timing(editHover, { toValue: 0, duration: 200, useNativeDriver: true }).start();
  const editWeb = Platform.OS === 'web' ? { onMouseEnter: eIn, onMouseLeave: eOut } : {};

  // Hover no botão deletar
  const delHover = useRef(new Animated.Value(0)).current;
  const dIn  = () => Animated.timing(delHover, { toValue: 1, duration: 140, useNativeDriver: true }).start();
  const dOut = () => Animated.timing(delHover, { toValue: 0, duration: 200, useNativeDriver: true }).start();
  const delWeb = Platform.OS === 'web' ? { onMouseEnter: dIn, onMouseLeave: dOut } : {};

  // Press scale nos botões de ação
  const editScale = useRef(new Animated.Value(1)).current;
  const delScale  = useRef(new Animated.Value(1)).current;
  const spr = (anim: Animated.Value, to: number) =>
    Animated.spring(anim, { toValue: to, useNativeDriver: true, speed: 24 }).start();

  return (
    <Animated.View
      style={[s.card, task.completed && s.cardDone, { opacity: cardHover.interpolate({ inputRange: [0, 1], outputRange: [1, 1] }) }]}
      {...cardWeb}
    >
      {/* Highlight de hover sobre o card inteiro */}
      <Animated.View
        style={[StyleSheet.absoluteFillObject, s.cardHoverOverlay, { opacity: cardHover }]}
        pointerEvents="none"
      />

      {/* Barra de prioridade */}
      {priorityColor && <View style={[s.priorityBar, { backgroundColor: priorityColor }]} />}

      <View style={s.content}>
        <View style={s.topRow}>
          <Text style={[s.text, task.completed && s.textDone]} numberOfLines={2}>
            {task.text}
          </Text>
          {task.priority && (
            <View style={[s.badge, { borderColor: priorityColor ?? '#1a1a35' }]}>
              <Text style={[s.badgeText, { color: priorityColor ?? '#333355' }]}>
                {task.priority.toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {task.dueDate && (
          <Text style={[s.date, isOverdue ? s.dateOverdue : s.dateOk]}>
            {isOverdue ? '⚠ Venceu: ' : '⏰ Até: '}
            {new Date(task.dueDate).toLocaleDateString()}
          </Text>
        )}

        {task.completed && <Text style={s.completedTag}>✓ CONCLUÍDA</Text>}
      </View>

      {/* Ações */}
      <View style={s.actions}>
        {/* Editar */}
        <Animated.View style={{ transform: [{ scale: editScale }] }} {...editWeb}>
          <TouchableOpacity
            style={s.actionBtn}
            onPress={updateMode}
            onPressIn={() => spr(editScale, 0.88)}
            onPressOut={() => spr(editScale, 1)}
            accessibilityRole="button"
          >
            <Animated.View style={[StyleSheet.absoluteFillObject, s.editHoverBg, { opacity: editHover }]} />
            <Feather name="edit-2" size={15} color="#00d4ff" />
          </TouchableOpacity>
        </Animated.View>

        {/* Deletar */}
        <Animated.View style={{ transform: [{ scale: delScale }] }} {...delWeb}>
          <TouchableOpacity
            style={[s.actionBtn, s.deleteBtn]}
            onPress={deleteTask}
            onPressIn={() => spr(delScale, 0.88)}
            onPressOut={() => spr(delScale, 1)}
            accessibilityRole="button"
          >
            <Animated.View style={[StyleSheet.absoluteFillObject, s.delHoverBg, { opacity: delHover }]} />
            <AntDesign name="delete" size={15} color="#ff4466" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

const s = StyleSheet.create({
  card: {
    backgroundColor: '#0a0a1a', borderWidth: 1, borderColor: '#1a1a35',
    borderRadius: 10, marginBottom: 8, flexDirection: 'row',
    alignItems: 'center', overflow: 'hidden',
  },
  cardDone: { borderColor: '#00ff8820', opacity: 0.72 },
  cardHoverOverlay: { backgroundColor: 'rgba(0,212,255,0.05)' },
  priorityBar: { width: 3, alignSelf: 'stretch' },
  content: { flex: 1, paddingVertical: 12, paddingHorizontal: 14 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  text: { color: '#e0e0ff', fontSize: 14, flex: 1, lineHeight: 20 },
  textDone: { textDecorationLine: 'line-through', color: '#333355' },
  badge: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  date: { fontSize: 11, marginTop: 5, fontWeight: '600' },
  dateOverdue: { color: '#ff4466' },
  dateOk:      { color: '#00d4ff' },
  completedTag: { marginTop: 5, fontSize: 9, fontWeight: '700', color: '#00ff88', letterSpacing: 2 },
  actions: { flexDirection: 'row', paddingRight: 12, gap: 8 },
  actionBtn: {
    padding: 9, borderRadius: 7, overflow: 'hidden',
    backgroundColor: 'rgba(0,212,255,0.06)', borderWidth: 1, borderColor: '#1a1a35',
  },
  deleteBtn: { backgroundColor: 'rgba(255,68,102,0.06)' },
  editHoverBg: { backgroundColor: 'rgba(0,212,255,0.18)' },
  delHoverBg:  { backgroundColor: 'rgba(255,68,102,0.18)' },
});

export default TaskItem;
