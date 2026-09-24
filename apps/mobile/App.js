import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Linking,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { io } from 'socket.io-client';

// ── Config ────────────────────────────────────────────────────────────────────
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:13000';

// ── API helpers ───────────────────────────────────────────────────────────────
async function apiPost(path, body, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'API error');
  return data;
}

async function apiGet(path, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'API error');
  return data;
}

// ── Login Screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password');
      return;
    }
    setLoading(true);
    try {
      const data = await apiPost('/auth/login', { actorId: email, credential: password });
      await AsyncStorage.setItem('aevora_token', data.access_token);
      onLogin(data.access_token);
    } catch (e) {
      Alert.alert('Login Failed', e.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.loginContainer}>
      <StatusBar barStyle="light-content" />
      <View style={styles.loginCard}>
        <Text style={styles.logo}>AEVORA</Text>
        <Text style={styles.subtitle}>Mobile Command Center</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#666"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#666"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Sign In</Text>}
        </TouchableOpacity>
        <Text style={styles.hint}>Connect to: {API_BASE}</Text>
      </View>
    </View>
  );
}

// ── Pairing Screen ────────────────────────────────────────────────────────────
function PairingScreen({ token, onPaired }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const hardwareId = `android-${Math.random().toString(36).slice(2, 12)}`;

  const handlePair = async () => {
    if (code.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit pairing code from your Windows app');
      return;
    }
    setLoading(true);
    try {
      const data = await apiPost('/devices/pairing/verify', {
        code,
        hardwareId,
        deviceName: `Android - ${Platform.OS}`,
      });
      await AsyncStorage.setItem('aevora_device_id', data.deviceId);
      onPaired(data.deviceId);
    } catch (e) {
      Alert.alert('Pairing Failed', e.message || 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.loginContainer}>
      <View style={styles.loginCard}>
        <Text style={styles.logo}>AEVORA</Text>
        <Text style={styles.subtitle}>Pair Your Device</Text>
        <Text style={styles.hint}>Enter the 6-digit code shown on your Windows AEVORA app</Text>
        <TextInput
          style={[styles.input, styles.codeInput]}
          placeholder="000000"
          placeholderTextColor="#666"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
        />
        <TouchableOpacity style={styles.loginBtn} onPress={handlePair} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Pair Device</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Realtime + notifications ──────────────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

function notify(title, body) {
  Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null }).catch(() => {});
}

const REALTIME_EVENTS = {
  'call.scheduled': (d) => ['📞 Call scheduled', `${d.businessName} — ${d.phone}`],
  'lead.interested': (d) => ['🔥 Lead interested', `${d.businessName} wants to talk — call them`],
  'payment.received': (d) => ['💰 Payment received', `₹${((d.amountPaise || 0) / 100).toLocaleString('en-IN')}`],
  'company.shutdown': () => ['⛔ Company shut down', 'Balance below minimum — all agents stopped. Deposit to resume.'],
  'company.recovered': () => ['✅ Company recovered', 'Agents resumed.'],
};

function useRealtime(token, deviceId, onEvent) {
  useEffect(() => {
    if (!token) return;
    Notifications.requestPermissionsAsync().catch(() => {});
    // The server verifies this JWT on connect and derives the user from it.
    const socket = io(API_BASE, { transports: ['websocket'], auth: { token } });
    socket.on('connect', () => socket.emit('device:identify', { deviceId }));
    Object.keys(REALTIME_EVENTS).forEach((ev) =>
      socket.on(ev, (data) => {
        const [title, body] = REALTIME_EVENTS[ev](data || {});
        notify(title, body);
        onEvent(ev, data || {});
      }),
    );
    return () => socket.disconnect();
  }, [token, deviceId]);
}

// ── Call Screen ───────────────────────────────────────────────────────────────
const OUTCOMES = [
  { label: 'Interested', value: 'INTERESTED', color: '#22c55e' },
  { label: 'Not interested', value: 'NOT_INTERESTED', color: '#ef4444' },
  { label: 'No answer', value: 'NO_RESPONSE', color: '#f59e0b' },
];

function CallScreen({ token, call, onClose, onDone }) {
  const [called, setCalled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [discoveryCallId, setDiscoveryCallId] = useState(null);
  const [notes, setNotes] = useState('');

  const dial = () => {
    Linking.openURL(`tel:${String(call.phone).replace(/[^\d+]/g, '')}`).catch(() => Alert.alert('Error', 'Could not open dialer'));
    setCalled(true);
  };

  const logOutcome = async (outcome) => {
    setBusy(true);
    try {
      await apiPost(`/outreach/campaigns/${call.campaignId}/outcome`, { outcome }, token);
      if (outcome === 'INTERESTED') {
        const calls = await apiGet('/outreach/discovery-calls', token);
        const dc = calls.find((c) => c.leadId === call.leadId && c.status === 'SCHEDULED');
        if (dc) return setDiscoveryCallId(dc.id);
      }
      onDone();
    } catch (e) {
      Alert.alert('Failed', e.message);
    } finally {
      setBusy(false);
    }
  };

  const saveNotes = async () => {
    if (!notes.trim()) return Alert.alert('Notes needed', 'Type what the client needs, budget and timeline.');
    setBusy(true);
    try {
      await apiPost(`/outreach/discovery-calls/${discoveryCallId}/transcript`, { transcript: notes }, token);
      Alert.alert('Saved', 'Needs extracted — the delivery team will scope a sample.');
      onDone();
    } catch (e) {
      Alert.alert('Failed', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <ScrollView style={styles.dashContainer} contentContainerStyle={{ padding: 16, paddingTop: 48 }}>
        <Text style={styles.headerTitle}>CALL</Text>
        <Text style={styles.callName}>{call.businessName}</Text>
        <Text style={styles.callPhone}>{call.phone}</Text>
        {call.script ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Suggested script</Text>
            <Text style={styles.cardMeta}>{call.script}</Text>
          </View>
        ) : null}

        {!discoveryCallId ? (
          <>
            <TouchableOpacity style={styles.loginBtn} onPress={dial} disabled={busy}>
              <Text style={styles.loginBtnText}>📞 Call Now</Text>
            </TouchableOpacity>
            {!called && (
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setCalled(true)}>
                <Text style={styles.secondaryText}>Mark as Called</Text>
              </TouchableOpacity>
            )}
            {called && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Log outcome</Text>
                {OUTCOMES.map((o) => (
                  <TouchableOpacity key={o.value} style={[styles.outcomeBtn, { borderColor: o.color }]} onPress={() => logOutcome(o.value)} disabled={busy}>
                    <Text style={{ color: o.color, fontWeight: '700' }}>{o.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {busy && <ActivityIndicator color="#3b82f6" style={{ marginTop: 12 }} />}
          </>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Discovery notes</Text>
            <Text style={styles.cardMeta}>What do they need? Website / automation / app, budget, timeline.</Text>
            <TextInput
              style={[styles.input, { minHeight: 140, textAlignVertical: 'top', marginTop: 8 }]}
              multiline
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Wants a website with menu + WhatsApp auto-reply, budget ₹15,000, 1 month"
              placeholderTextColor="#666"
            />
            <TouchableOpacity style={styles.loginBtn} onPress={saveNotes} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Save notes</Text>}
            </TouchableOpacity>
          </View>
        )}
        <TouchableOpacity style={styles.logoutBtn} onPress={onClose}>
          <Text style={styles.logoutText}>Close</Text>
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  );
}

// ── Lead Profile ──────────────────────────────────────────────────────────────
function LeadProfile({ lead, history, onClose, onCall }) {
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <ScrollView style={styles.dashContainer} contentContainerStyle={{ padding: 16, paddingTop: 48 }}>
        <Text style={styles.callName}>{lead.name}</Text>
        <View style={styles.card}>
          <Text style={styles.cardMeta}>Status: {lead.status}  ·  Score: {lead.qualityScore ?? '—'}</Text>
          {lead.contactPhone ? <Text style={styles.cardMeta}>Phone: {lead.contactPhone}</Text> : null}
          {lead.contactEmail ? <Text style={styles.cardMeta}>Email: {lead.contactEmail}</Text> : null}
          {lead.industry ? <Text style={styles.cardMeta}>Category: {lead.industry}</Text> : null}
          {lead.lastContactedAt ? <Text style={styles.cardMeta}>Last contact: {new Date(lead.lastContactedAt).toLocaleString()}</Text> : null}
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact history</Text>
          {history.length === 0 ? (
            <Text style={styles.cardMeta}>No outreach yet</Text>
          ) : (
            history.map((c) => (
              <Text key={c.id} style={styles.cardMeta}>
                {new Date(c.createdAt).toLocaleDateString()} · {c.channel} · {c.status}
                {c.outcome ? ` · ${c.outcome}` : ''}
              </Text>
            ))
          )}
        </View>
        {onCall && (
          <TouchableOpacity style={styles.loginBtn} onPress={onCall}>
            <Text style={styles.loginBtnText}>📞 Open call screen</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.logoutBtn} onPress={onClose}>
          <Text style={styles.logoutText}>Close</Text>
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  );
}

// ── Dashboard Screen ──────────────────────────────────────────────────────────
function DashboardScreen({ token, deviceId, onLogout }) {
  const [devices, setDevices] = useState([]);
  const [connected, setConnected] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [leads, setLeads] = useState([]);
  const [activeCall, setActiveCall] = useState(null);
  const [profileLeadId, setProfileLeadId] = useState(null);
  const [shutdown, setShutdown] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [d, c, l] = await Promise.all([
        apiGet('/devices', token),
        apiGet('/outreach/campaigns', token),
        apiGet('/lead-gen/leads', token),
      ]);
      setDevices(d);
      setCampaigns(c);
      setLeads(l);
      setConnected(true);
    } catch {
      setConnected(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    if (!deviceId) return;
    const hb = setInterval(async () => {
      try { await fetch(`${API_BASE}/devices/${deviceId}/heartbeat`, { method: 'POST' }); } catch {}
    }, 30000);
    return () => clearInterval(hb);
  }, [deviceId]);

  useRealtime(token, deviceId, (ev, data) => {
    if (ev === 'call.scheduled') setActiveCall(data);
    if (ev === 'company.shutdown') setShutdown(true);
    if (ev === 'company.recovered') setShutdown(false);
    refresh();
  });

  const callFromCampaign = (c) => ({
    campaignId: c.id, leadId: c.leadId, businessName: c.lead?.name, phone: c.lead?.contactPhone, script: null,
  });

  // Awaiting follow-up: phone calls to place + contacted/interested leads.
  const toCall = campaigns.filter((c) => c.channel === 'PHONE' && c.status === 'SCHEDULED' && c.lead?.contactPhone);
  const followUp = leads.filter((l) => l.status === 'CONTACTED' || l.status === 'QUALIFIED');
  const profileLead = leads.find((l) => l.id === profileLeadId);
  const profileHistory = campaigns.filter((c) => c.leadId === profileLeadId);
  const profileCall = profileHistory.find((c) => c.channel === 'PHONE' && c.status === 'SCHEDULED');
  const statusColor = connected ? '#22c55e' : '#ef4444';

  return (
    <View style={styles.dashContainer}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>AEVORA</Text>
          <Text style={styles.headerSub}>Mobile Dashboard</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={styles.statusText}>{connected ? 'Connected' : 'Offline'}</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {shutdown && (
          <View style={[styles.card, { borderColor: '#ef4444' }]}>
            <Text style={[styles.cardTitle, { color: '#ef4444' }]}>⛔ Company shut down</Text>
            <Text style={styles.cardMeta}>Real-money balance is below the minimum. Log a deposit on the laptop to resume.</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>📞 Calls to make ({toCall.length})</Text>
          {toCall.length === 0 ? (
            <Text style={styles.cardMeta}>No calls scheduled</Text>
          ) : (
            toCall.map((c) => (
              <TouchableOpacity key={c.id} style={styles.leadRow} onPress={() => setActiveCall(callFromCampaign(c))}>
                <Text style={styles.deviceName}>{c.lead.name}</Text>
                <Text style={styles.cardMeta}>{c.lead.contactPhone}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🗂 Leads awaiting follow-up ({followUp.length})</Text>
          {followUp.length === 0 ? (
            <Text style={styles.cardMeta}>Nothing pending</Text>
          ) : (
            followUp.slice(0, 30).map((l) => (
              <TouchableOpacity key={l.id} style={styles.leadRow} onPress={() => setProfileLeadId(l.id)}>
                <Text style={styles.deviceName}>{l.name}</Text>
                <Text style={styles.cardMeta}>
                  {l.status === 'QUALIFIED' ? 'Interested — discovery call' : 'Awaiting reply'}
                  {l.lastContactedAt ? ` · last contact ${new Date(l.lastContactedAt).toLocaleDateString()}` : ''}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🖥 Connected Devices</Text>
          {devices.length === 0 ? (
            <Text style={styles.cardMeta}>No devices paired yet</Text>
          ) : (
            devices.map((d) => (
              <View key={d.id} style={styles.deviceRow}>
                <Text style={styles.deviceName}>{d.name || d.type}</Text>
                <View style={[styles.statusPill, { backgroundColor: d.status === 'ACTIVE' ? '#22c55e22' : '#ef444422' }]}>
                  <Text style={{ color: d.status === 'ACTIVE' ? '#22c55e' : '#ef4444', fontSize: 11 }}>{d.status}</Text>
                </View>
              </View>
            ))
          )}
          <TouchableOpacity style={styles.refreshBtn} onPress={refresh}>
            <Text style={styles.refreshText}>↻ Refresh</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      {profileLead && !activeCall && (
        <LeadProfile
          lead={profileLead}
          history={profileHistory}
          onClose={() => setProfileLeadId(null)}
          onCall={profileCall ? () => setActiveCall(callFromCampaign(profileCall)) : null}
        />
      )}
      {activeCall && (
        <CallScreen
          token={token}
          call={activeCall}
          onClose={() => setActiveCall(null)}
          onDone={() => { setActiveCall(null); setProfileLeadId(null); refresh(); }}
        />
      )}
    </View>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const storedToken = await AsyncStorage.getItem('aevora_token');
      const storedDeviceId = await AsyncStorage.getItem('aevora_device_id');
      setToken(storedToken);
      setDeviceId(storedDeviceId);
      setLoading(false);
    })();
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['aevora_token', 'aevora_device_id']);
    setToken(null);
    setDeviceId(null);
  };

  if (loading) {
    return (
      <View style={[styles.loginContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!token) return <LoginScreen onLogin={(t) => setToken(t)} />;
  if (!deviceId) return <PairingScreen token={token} onPaired={(id) => setDeviceId(id)} />;
  return <DashboardScreen token={token} deviceId={deviceId} onLogout={handleLogout} />;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  loginContainer: { flex: 1, backgroundColor: '#0a0f1e', justifyContent: 'center', padding: 20 },
  loginCard: { backgroundColor: '#111827', borderRadius: 16, padding: 28, borderWidth: 1, borderColor: '#1e3a5f' },
  logo: { fontSize: 32, fontWeight: '800', color: '#3b82f6', letterSpacing: 4, textAlign: 'center' },
  subtitle: { color: '#94a3b8', fontSize: 14, textAlign: 'center', marginTop: 4, marginBottom: 28 },
  input: { backgroundColor: '#1f2937', borderRadius: 10, padding: 14, color: '#f1f5f9', fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: '#374151' },
  codeInput: { fontSize: 28, textAlign: 'center', letterSpacing: 8, fontWeight: '700' },
  loginBtn: { backgroundColor: '#3b82f6', borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 8 },
  loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  hint: { color: '#64748b', fontSize: 11, textAlign: 'center', marginTop: 16 },
  dashContainer: { flex: 1, backgroundColor: '#0a0f1e' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 48, backgroundColor: '#111827', borderBottomWidth: 1, borderBottomColor: '#1e3a5f' },
  headerTitle: { color: '#3b82f6', fontSize: 20, fontWeight: '800', letterSpacing: 3 },
  headerSub: { color: '#64748b', fontSize: 11 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: '#94a3b8', fontSize: 12 },
  content: { flex: 1, padding: 16 },
  card: { backgroundColor: '#111827', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1e3a5f' },
  cardTitle: { color: '#f1f5f9', fontWeight: '700', fontSize: 15, marginBottom: 8 },
  cardMeta: { color: '#94a3b8', fontSize: 13, marginTop: 4 },
  deviceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  deviceName: { color: '#e2e8f0', fontSize: 13 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  refreshBtn: { marginTop: 8, alignItems: 'center' },
  refreshText: { color: '#3b82f6', fontSize: 13 },
  logoutBtn: { margin: 16, backgroundColor: '#1f2937', borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#374151' },
  logoutText: { color: '#94a3b8', fontWeight: '600' },
  leadRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  callName: { color: '#f1f5f9', fontSize: 24, fontWeight: '800', marginTop: 8 },
  callPhone: { color: '#3b82f6', fontSize: 20, fontWeight: '700', marginVertical: 12 },
  secondaryBtn: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#374151' },
  secondaryText: { color: '#e2e8f0', fontWeight: '600' },
  outcomeBtn: { borderWidth: 1, borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 8 },
});
