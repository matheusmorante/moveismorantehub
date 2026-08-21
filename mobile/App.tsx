import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, StatusBar, Alert, ScrollView, Vibration, ActivityIndicator, Platform, TextInput, Modal, FlatList, RefreshControl, SectionList, PanResponder } from 'react-native';
import { WebView } from 'react-native-webview';
import { ClipboardList, Bell, Hammer, ShoppingBag, Truck, BarChart3, AlertTriangle, Mail, Lock, ArrowRight, Eye, EyeOff, LayoutDashboard, Wrench, RotateCcw, RotateCw, Calendar, ChevronDown, ChevronUp, Check, Moon, Sun, User, Settings, LogOut, ShieldCheck, X, Search, Clock, Sparkles, Volume2, Square, RefreshCw, Play, Pause } from 'lucide-react-native';

// ... (mesmo escopo anterior)
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import Svg, { Path } from 'react-native-svg';

WebBrowser.maybeCompleteAuthSession();

// Conexão direta com Supabase
const SUPABASE_URL = "https://hkoxhourxwlddgsfdgws.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

const WEB_URL = "https://morantehub.vercel.app";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Som de notificação premium em alta definição (URL pública estável)
const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav";

const PERIOD_OPTIONS = [
  { id: 'today', label: 'Hoje' },
  { id: 'this_week', label: 'Esta Semana' },
  { id: 'this_month', label: 'Este Mês' },
  { id: 'last_30_days', label: 'Últimos 30 Dias' },
  { id: 'this_quarter', label: 'Este Trimestre' },
  { id: 'this_year', label: 'Este Ano' },
  { id: 'last_year', label: 'Último Ano' },
];

const MASTER_DEFAULT_PROFILE = {
  id: '13eab361-be48-4e49-be4b-4ad79813b812',
  email: 'matheusmorante002@gmail.com',
  role: 'administrator',
  fullName: 'Matheus Morante'
};

const getOrderTotalValue = (item: any) => {
  if (!item) return 0;
  const orderData = item.order_data || {};

  if (orderData.paymentsSummary?.totalOrderValue != null && Number(orderData.paymentsSummary.totalOrderValue) > 0) {
    return Number(orderData.paymentsSummary.totalOrderValue);
  }

  if (orderData.totalValue != null && Number(orderData.totalValue) > 0) {
    return Number(orderData.totalValue);
  }

  if (item.total_value != null && Number(item.total_value) > 0) {
    return Number(item.total_value);
  }

  if (orderData.total != null && Number(orderData.total) > 0) {
    return Number(orderData.total);
  }

  const items = orderData.items || item.items || [];
  if (Array.isArray(items) && items.length > 0) {
    const sum = items.reduce((acc: number, i: any) => {
      const price = Number(i.unitPrice ?? i.price ?? i.total ?? 0);
      const qty = Number(i.quantity ?? 1);
      return acc + (price * qty);
    }, 0);
    if (sum > 0) return sum;
  }

  return 0;
};

const formatOrderDate = (rawDate?: string) => {
  if (!rawDate) return '';
  if (rawDate.includes('/')) return rawDate;
  const clean = rawDate.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return clean;
};

// Componente para exibir todas as informações do pedido (Observações acima dos dados do cliente + Formas de Pagamento)
function OrderDetailsBody({ order, isDarkMode }: { order: any; isDarkMode: boolean }) {
  if (!order) return null;

  const detailData = order.order_data || {};
  const cInfo = detailData.customerData || {};
  const ship = detailData.shipping || {};
  const items = detailData.items || order.items || [];
  const totalVal = getOrderTotalValue(order);

  // Observações Importantes (Carrega observation, observations, generalObservations, notes, etc.)
  const generalObs = detailData.observation || detailData.observations || detailData.generalObservations || detailData.notes || order.observation || order.observations || order.notes;
  const shippingObs = ship.observation || ship.observations || ship.notes || ship.scheduling?.notes || ship.scheduling?.observation;
  const internalNotes = detailData.internalNotes || detailData.sellerNotes || detailData.seller_notes || detailData.assistanceDescription || order.assistanceDescription;

  // Formas de Pagamento
  const rawPayments = detailData.paymentMethods || detailData.paymentData || detailData.payments || detailData.payment || [];
  const normalizedPayments = Array.isArray(rawPayments) ? rawPayments : (rawPayments ? [rawPayments] : []);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={true}
    >
      {/* 1. Resumo do Pedido */}
      <View style={{ backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#f1f5f9', gap: 12 }}>
        <Text style={{ fontSize: 11, fontWeight: '900', color: '#2563eb', textTransform: 'uppercase', letterSpacing: 1 }}>
          Resumo do Pedido
        </Text>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Tipo de Pedido</Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: isDarkMode ? '#f8fafc' : '#0f172a', marginTop: 2 }}>
              {detailData.orderType === 'assistance' ? '🛠️ Assistência Técnica' : detailData.orderType === 'budget' ? '📝 Orçamento' : detailData.orderType === 'showroom' ? '🛋️ Mostruário' : '🛍️ Venda de Produto'}
            </Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Data do Pedido</Text>
            <Text style={{ fontSize: 13, fontWeight: '800', color: isDarkMode ? '#cbd5e1' : '#475569', marginTop: 2 }}>
              {formatOrderDate(detailData.date || order.created_at)}
            </Text>
          </View>
        </View>
      </View>

      {/* 2. Observações Importantes com Rótulos (FICAM LOGO ACIMA DOS DADOS DO CLIENTE) */}
      <View style={{ backgroundColor: isDarkMode ? '#1e293b' : '#fffbeb', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#fef3c7', gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <AlertTriangle size={16} color="#d97706" />
          <Text style={{ fontSize: 11, fontWeight: '900', color: '#b45309', textTransform: 'uppercase', letterSpacing: 1 }}>
            Observações Importantes
          </Text>
        </View>

        {/* Renderização individual de cada observação (separada por ';' ou quebra de linha) em containers próprios */}
        {(() => {
          const splitObs = (rawText?: string) => {
            if (!rawText) return [];
            return rawText
              .split(/;|\n|\r\n/)
              .map(item => item.trim())
              .filter(item => item.length > 0);
          };

          const generalList = splitObs(generalObs);
          const shippingList = splitObs(shippingObs);
          const internalList = splitObs(internalNotes);

          const totalObsCount = generalList.length + shippingList.length + internalList.length;

          if (totalObsCount === 0) {
            return (
              <View style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#fde68a' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: isDarkMode ? '#cbd5e1' : '#64748b' }}>
                  Nenhuma observação registrada neste pedido.
                </Text>
              </View>
            );
          }

          return (
            <View style={{ gap: 10 }}>
              {/* Observações Gerais do Pedido */}
              {generalList.map((obsText, gIdx) => (
                <View 
                  key={`gen-${gIdx}`} 
                  style={{ 
                    backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', 
                    borderRadius: 14, 
                    padding: 12, 
                    borderWidth: 1, 
                    borderColor: isDarkMode ? '#334155' : '#fde68a', 
                    gap: 4 
                  }}
                >
                  <View style={{ alignSelf: 'flex-start', backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginBottom: 4 }}>
                    <Text style={{ fontSize: 9, fontWeight: '900', color: '#b45309', textTransform: 'uppercase' }}>
                      📌 OBSERVAÇÕES IMPORTANTES {generalList.length > 1 ? `#${gIdx + 1}` : ''}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: isDarkMode ? '#f8fafc' : '#1e293b', lineHeight: 18 }}>
                    {obsText}
                  </Text>
                </View>
              ))}

              {/* Observações de Entrega / Logística */}
              {shippingList.map((shipText, sIdx) => (
                <View 
                  key={`ship-${sIdx}`} 
                  style={{ 
                    backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', 
                    borderRadius: 14, 
                    padding: 12, 
                    borderWidth: 1, 
                    borderColor: isDarkMode ? '#334155' : '#bfdbfe', 
                    gap: 4 
                  }}
                >
                  <View style={{ alignSelf: 'flex-start', backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginBottom: 4 }}>
                    <Text style={{ fontSize: 9, fontWeight: '900', color: '#1d4ed8', textTransform: 'uppercase' }}>
                      🚚 OBSERVAÇÃO DE ENTREGA / LOGÍSTICA {shippingList.length > 1 ? `#${sIdx + 1}` : ''}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: isDarkMode ? '#f8fafc' : '#1e293b', lineHeight: 18 }}>
                    {shipText}
                  </Text>
                </View>
              ))}

              {/* Notas Internas do Vendedor */}
              {internalList.map((intText, iIdx) => (
                <View 
                  key={`int-${iIdx}`} 
                  style={{ 
                    backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', 
                    borderRadius: 14, 
                    padding: 12, 
                    borderWidth: 1, 
                    borderColor: isDarkMode ? '#334155' : '#e9d5ff', 
                    gap: 4 
                  }}
                >
                  <View style={{ alignSelf: 'flex-start', backgroundColor: '#f3e8ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginBottom: 4 }}>
                    <Text style={{ fontSize: 9, fontWeight: '900', color: '#7e22ce', textTransform: 'uppercase' }}>
                      ⚙️ NOTA INTERNA DO VENDEDOR {internalList.length > 1 ? `#${iIdx + 1}` : ''}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: isDarkMode ? '#f8fafc' : '#1e293b', lineHeight: 18 }}>
                    {intText}
                  </Text>
                </View>
              ))}
            </View>
          );
        })()}
      </View>

      {/* 3. Dados do Cliente (LOGO ABAIXO DAS OBSERVAÇÕES) */}
      <View style={{ backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#f1f5f9', gap: 10 }}>
        <Text style={{ fontSize: 11, fontWeight: '900', color: '#2563eb', textTransform: 'uppercase', letterSpacing: 1 }}>
          Dados do Cliente
        </Text>

        <Text style={{ fontSize: 16, fontWeight: '900', color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
          {cInfo.fullName || order.customer_name || 'Cliente não informado'}
        </Text>

        {cInfo.cpfCnpj ? (
          <Text style={{ fontSize: 12, fontWeight: '600', color: isDarkMode ? '#cbd5e1' : '#475569' }}>
            CPF/CNPJ: {cInfo.cpfCnpj}
          </Text>
        ) : null}

        {cInfo.phone || cInfo.whatsapp ? (
          <Text style={{ fontSize: 12, fontWeight: '600', color: isDarkMode ? '#cbd5e1' : '#475569' }}>
            Telefone / WhatsApp: {cInfo.phone || cInfo.whatsapp}
          </Text>
        ) : null}

        {cInfo.email ? (
          <Text style={{ fontSize: 12, fontWeight: '600', color: isDarkMode ? '#cbd5e1' : '#475569' }}>
            E-mail: {cInfo.email}
          </Text>
        ) : null}

        {cInfo.street || cInfo.address ? (
          <View style={{ marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: isDarkMode ? '#334155' : '#f8fafc' }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Endereço de Entrega / Cobrança</Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: isDarkMode ? '#cbd5e1' : '#475569', marginTop: 2 }}>
              {cInfo.street || cInfo.address}, {cInfo.number || 'S/N'} {cInfo.complement ? `(${cInfo.complement})` : ''} - {cInfo.neighborhood || ''} ({cInfo.city || ''}/{cInfo.state || ''}) {cInfo.cep ? `CEP: ${cInfo.cep}` : ''}
            </Text>
          </View>
        ) : null}
      </View>

      {/* 4. Logística & Agendamento */}
      <View style={{ backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#f1f5f9', gap: 10 }}>
        <Text style={{ fontSize: 11, fontWeight: '900', color: '#2563eb', textTransform: 'uppercase', letterSpacing: 1 }}>
          Logística & Agendamento
        </Text>

        <Text style={{ fontSize: 12, fontWeight: '700', color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
          Modalidade: {ship.deliveryMethod === 'pickup' ? '🛍️ Retirada na Loja' : '🚚 Entrega em Domicílio'}
        </Text>

        {ship.scheduling?.date ? (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563eb' }}>
              Data Agendada: {formatOrderDate(ship.scheduling.date)}
            </Text>
            {ship.scheduling?.startTime ? (
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b' }}>
                Horário: {ship.scheduling.startTime} {ship.scheduling.endTime ? `às ${ship.scheduling.endTime}` : ''}
              </Text>
            ) : null}
          </View>
        ) : (
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#d97706' }}>Agendamento Pendente / A Definir</Text>
        )}
      </View>

      {/* 5. Produtos do Pedido */}
      <View style={{ backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#f1f5f9', gap: 12 }}>
        <Text style={{ fontSize: 11, fontWeight: '900', color: '#2563eb', textTransform: 'uppercase', letterSpacing: 1 }}>
          Produtos do Pedido ({items.length})
        </Text>

        {items.length === 0 ? (
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#94a3b8' }}>Nenhum item listado.</Text>
        ) : (
          items.map((prod: any, idx: number) => {
            const name = prod.name || prod.productName || prod.description || `Item #${idx + 1}`;
            const qty = prod.quantity || prod.qty || 1;
            const unitP = prod.unitPrice || prod.price || 0;
            const itemTotal = unitP * qty;
            const handling = prod.handlingType || prod.handling_type;

            return (
              <View key={idx} style={{ paddingVertical: 10, borderBottomWidth: idx === items.length - 1 ? 0 : 1, borderBottomColor: isDarkMode ? '#334155' : '#f1f5f9', gap: 4 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
                  {name}
                </Text>

                {handling ? (
                  <View style={{ alignSelf: 'flex-start', backgroundColor: '#ffedd5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 2 }}>
                    <Text style={{ fontSize: 9, fontWeight: '900', color: '#c2410c', textTransform: 'uppercase' }}>
                      🔨 {handling}
                    </Text>
                  </View>
                ) : null}

                {prod.notes ? (
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#d97706', fontStyle: 'italic' }}>
                    Obs do item: {prod.notes}
                  </Text>
                ) : null}

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748b' }}>
                    {qty}x de {Number(unitP).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '900', color: isDarkMode ? '#cbd5e1' : '#1e293b' }}>
                    {Number(itemTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* 6. Formas de Pagamento (COM STATUS DO PAGAMENTO) */}
      <View style={{ backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#f1f5f9', gap: 12 }}>
        {(() => {
          const paymentsSummary = detailData.paymentsSummary || order.paymentsSummary || {};
          const totalPaid = paymentsSummary.totalAmountPaid ?? paymentsSummary.totalPaid ?? totalVal;
          const remaining = paymentsSummary.amountRemaining ?? paymentsSummary.totalPending ?? 0;
          const isFullyPaid = remaining <= 0;

          return (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: '900', color: '#2563eb', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Formas de Pagamento
                </Text>

                {/* Badge de Status Geral do Pagamento */}
                <View style={{ backgroundColor: isFullyPaid ? '#dcfce7' : '#fef3c7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                  <Text style={{ fontSize: 10, fontWeight: '900', color: isFullyPaid ? '#15803d' : '#b45309', textTransform: 'uppercase' }}>
                    {isFullyPaid ? '✓ QUITADO' : '⏱ PAGO PARCIAL / PENDENTE'}
                  </Text>
                </View>
              </View>

              {normalizedPayments.length === 0 ? (
                <View style={{ backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc', padding: 12, borderRadius: 14, gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: isDarkMode ? '#cbd5e1' : '#475569' }}>
                      Pagamento no Fechamento
                    </Text>
                    <View style={{ backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ fontSize: 9, fontWeight: '900', color: '#15803d', textTransform: 'uppercase' }}>
                        ✓ PAGO / CONFIRMADO
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                normalizedPayments.map((pay: any, pIdx: number) => {
                  const pMethod = (pay.method || pay.type || pay.name || 'Pagamento').toLowerCase();
                  let label = '💳 OUTRO';
                  let bg = '#f1f5f9';
                  let color = '#475569';

                  if (pMethod.includes('pix')) { label = '⚡ PIX'; bg = '#dcfce7'; color = '#15803d'; }
                  else if (pMethod.includes('card') || pMethod.includes('cartao') || pMethod.includes('credito') || pMethod.includes('debito')) { label = '💳 CARTÃO DE CRÉDITO/DÉBITO'; bg = '#eff6ff'; color = '#1d4ed8'; }
                  else if (pMethod.includes('boleto')) { label = '📄 BOLETO BANCÁRIO'; bg = '#fef3c7'; color = '#b45309'; }
                  else if (pMethod.includes('dinheiro') || pMethod.includes('cash')) { label = '💵 DINHEIRO EM ESPÉCIE'; bg = '#dcfce7'; color = '#16a34a'; }

                  const val = pay.amount || pay.value || pay.total || 0;
                  const par = pay.installments || pay.parcelas || 1;

                  // Status Individual do Pagamento
                  const pStatus = (pay.status || pay.paymentStatus || 'paid').toLowerCase();
                  let statusLabel = '✓ PAGO';
                  let statusBg = '#dcfce7';
                  let statusColor = '#15803d';

                  if (pStatus.includes('pendent') || pStatus.includes('awaiting') || pStatus.includes('aguardando')) {
                    statusLabel = '⏱ PENDENTE';
                    statusBg = '#fef3c7';
                    statusColor = '#b45309';
                  } else if (pStatus.includes('cancel') || pStatus.includes('recusad') || pStatus.includes('failed')) {
                    statusLabel = '✕ CANCELADO';
                    statusBg = '#fee2e2';
                    statusColor = '#dc2626';
                  }

                  return (
                    <View key={pIdx} style={{ backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#e2e8f0', gap: 6 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ backgroundColor: bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                          <Text style={{ fontSize: 9, fontWeight: '900', color: color, textTransform: 'uppercase' }}>
                            {label}
                          </Text>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={{ backgroundColor: statusBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                            <Text style={{ fontSize: 9, fontWeight: '900', color: statusColor, textTransform: 'uppercase' }}>
                              {statusLabel}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 13, fontWeight: '900', color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
                            {Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </Text>
                        </View>
                      </View>

                      {par > 1 ? (
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b' }}>
                          Parcelamento: {par}x de {Number(val / par).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </Text>
                      ) : (
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b' }}>Pagamento à vista</Text>
                      )}
                    </View>
                  );
                })
              )}
            </>
          );
        })()}
      </View>

      {/* 7. Resumo Financeiro */}
      <View style={{ backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#f1f5f9', gap: 10 }}>
        <Text style={{ fontSize: 11, fontWeight: '900', color: '#2563eb', textTransform: 'uppercase', letterSpacing: 1 }}>
          Resumo Financeiro
        </Text>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: isDarkMode ? '#cbd5e1' : '#64748b' }}>Valor Total do Pedido:</Text>
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#2563eb' }}>
            {Number(totalVal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

// Componente Nativo: Lista de Pedidos (100% React Native sem WebView)
function NativeOrdersScreen({ isDarkMode }: { isDarkMode: boolean }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [displayCount, setDisplayCount] = useState(25);
  const [editingStatusOrder, setEditingStatusOrder] = useState<any>(null);
  const [selectedDetailOrder, setSelectedDetailOrder] = useState<any>(null);
  const [showTypeSelectModal, setShowTypeSelectModal] = useState(false);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (e) {
      console.warn('Erro ao buscar pedidos nativos:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel('realtime-native-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, []);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      setEditingStatusOrder(null);
      if (selectedDetailOrder && selectedDetailOrder.id === orderId) {
        setSelectedDetailOrder(prev => prev ? { ...prev, status: newStatus } : null);
      }
      Alert.alert('Sucesso', 'Status do pedido atualizado!');
    } catch (e) {
      Alert.alert('Erro', 'Falha ao atualizar o status do pedido.');
    }
  };

  const filteredOrders = orders.filter(o => {
    const orderData = o.order_data || {};
    const customerName = (orderData.customerData?.fullName || o.customer_name || '').toLowerCase();
    const idStr = (o.id || '').toLowerCase();
    const q = searchQuery.toLowerCase().trim();

    const matchesSearch = !q || customerName.includes(q) || idStr.includes(q);
    if (!matchesSearch) return false;

    const type = orderData.orderType || o.order_type || 'sale';
    if (selectedType === 'all') return true;
    return type === selectedType;
  });

  const displayedOrders = filteredOrders.slice(0, displayCount);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'fulfilled': return { bg: '#dcfce7', text: '#15803d', label: 'Atendido' };
      case 'scheduled': return { bg: '#fef3c7', text: '#b45309', label: 'Agendado' };
      case 'cancelled': return { bg: '#ffe4e6', text: '#be123c', label: 'Cancelado' };
      default: return { bg: '#f1f5f9', text: '#475569', label: 'Rascunho' };
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc' }}>
      {/* Busca Nativa */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#e2e8f0', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 }}>
          <Search size={18} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Buscar por cliente ou código #..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{ flex: 1, fontSize: 13, color: isDarkMode ? '#f8fafc' : '#0f172a', fontWeight: '600' }}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Botão Select de Tipo de Pedido */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
        <TouchableOpacity
          onPress={() => setShowTypeSelectModal(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
            borderWidth: 1,
            borderColor: isDarkMode ? '#334155' : '#cbd5e1',
            borderRadius: 16,
            paddingVertical: 10,
            paddingHorizontal: 14,
            elevation: 2,
            shadowColor: '#2563eb',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 6,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ClipboardList size={16} color="#2563eb" />
            <Text style={{ fontSize: 12, fontWeight: '800', color: isDarkMode ? '#f8fafc' : '#1e293b' }}>
              Tipo: {[
                { id: 'all', label: 'Todos os Pedidos' },
                { id: 'sale', label: 'Vendas de Produtos' },
                { id: 'budget', label: 'Orçamentos' },
                { id: 'assistance', label: 'Assistências Técnicas' },
                { id: 'return', label: 'Devoluções' }
              ].find(t => t.id === selectedType)?.label || 'Todos os Pedidos'}
            </Text>
          </View>
          <ChevronDown size={16} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Lista Nativa FlatList com Rolagem Infinita */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={{ marginTop: 12, fontSize: 12, fontWeight: '700', color: '#64748b' }}>Carregando pedidos nativos...</Text>
        </View>
      ) : (
        <FlatList
          data={displayedOrders}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={fetchOrders} colors={['#2563eb']} />
          }
          onEndReached={() => {
            if (displayCount < filteredOrders.length) {
              setDisplayCount(prev => prev + 20);
            }
          }}
          onEndReachedThreshold={0.5}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 12 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <ShoppingBag size={48} color="#cbd5e1" />
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#64748b', marginTop: 12 }}>Nenhum pedido encontrado</Text>
            </View>
          }
          renderItem={({ item }) => {
            const orderData = item.order_data || {};
            const statusInfo = getStatusColor(item.status || 'draft');
            const customerName = orderData.customerData?.fullName || item.customer_name || 'Cliente sem nome';
            const total = getOrderTotalValue(item);
            const isAssistance = orderData.orderType === 'assistance' || item.order_type === 'assistance';
            const isPickup = orderData.shipping?.deliveryMethod === 'pickup';

            return (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setSelectedDetailOrder(item)}
                style={{ backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ backgroundColor: isDarkMode ? '#334155' : '#f8fafc', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: isDarkMode ? '#475569' : '#e2e8f0' }}>
                      <Text style={{ fontSize: 10, fontWeight: '900', color: isDarkMode ? '#cbd5e1' : '#64748b', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                        #{item.id?.slice(-6).toUpperCase()}
                      </Text>
                    </View>
                    {isAssistance ? (
                      <Hammer size={14} color="#f97316" />
                    ) : isPickup ? (
                      <ShoppingBag size={14} color="#a855f7" />
                    ) : (
                      <Truck size={14} color="#16a34a" />
                    )}
                  </View>

                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation(); setEditingStatusOrder(item); }}
                    style={{ backgroundColor: statusInfo.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  >
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusInfo.text }} />
                    <Text style={{ fontSize: 10, fontWeight: '900', color: statusInfo.text, textTransform: 'uppercase' }}>
                      {statusInfo.label}
                    </Text>
                    <ChevronDown size={10} color={statusInfo.text} />
                  </TouchableOpacity>
                </View>

                <Text style={{ fontSize: 14, fontWeight: '800', color: isDarkMode ? '#f8fafc' : '#0f172a', marginBottom: 6 }}>
                  {customerName}
                </Text>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: isDarkMode ? '#334155' : '#f8fafc' }}>
                  <View>
                    <Text style={{ fontSize: 9, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>TOTAL</Text>
                    <Text style={{ fontSize: 15, fontWeight: '900', color: '#2563eb', marginTop: 2 }}>
                      {Number(total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end', gap: 3 }}>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 9, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>DATA DO PEDIDO</Text>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: isDarkMode ? '#cbd5e1' : '#475569', marginTop: 1 }}>
                        {formatOrderDate(orderData.date || item.created_at)}
                      </Text>
                    </View>

                    {orderData.shipping?.scheduling?.date ? (
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 9, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>AGENDADO</Text>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#2563eb', marginTop: 1 }}>
                          {formatOrderDate(orderData.shipping.scheduling.date)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Modal Nativo em Tela Cheia de Detalhes do Pedido (Ocupa o Body Todo) */}
      <Modal
        visible={!!selectedDetailOrder}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setSelectedDetailOrder(null)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc' }}>
          {/* Cabeçalho Fixo do Modal */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: isDarkMode ? '#1e293b' : '#e2e8f0',
            backgroundColor: isDarkMode ? '#1e293b' : '#ffffff'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setSelectedDetailOrder(null)}
                style={{ padding: 6, borderRadius: 12, backgroundColor: isDarkMode ? '#334155' : '#f1f5f9' }}
              >
                <X size={20} color={isDarkMode ? '#f8fafc' : '#0f172a'} />
              </TouchableOpacity>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '900', color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
                  Pedido #{selectedDetailOrder?.id?.slice(-6).toUpperCase()}
                </Text>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>
                  Detalhes Completos do Pedido
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setEditingStatusOrder(selectedDetailOrder)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 14,
                backgroundColor: getStatusColor(selectedDetailOrder?.status || 'draft').bg
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '900', color: getStatusColor(selectedDetailOrder?.status || 'draft').text, textTransform: 'uppercase' }}>
                {getStatusColor(selectedDetailOrder?.status || 'draft').label}
              </Text>
            </TouchableOpacity>
          </View>
          {/* Conteúdo com Scroll Vertical Extenso */}
          <OrderDetailsBody order={selectedDetailOrder} isDarkMode={isDarkMode} />
        </SafeAreaView>
      </Modal>

      {/* Modal Nativo de Troca de Status */}
      <Modal
        visible={!!editingStatusOrder}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingStatusOrder(null)}
      >
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }} activeOpacity={1} onPress={() => setEditingStatusOrder(null)}>
          <View style={{ width: '100%', maxWidth: 320, backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#e2e8f0' }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: isDarkMode ? '#f8fafc' : '#0f172a', marginBottom: 16, textAlign: 'center' }}>
              Atualizar Status do Pedido
            </Text>

            {[
              { id: 'draft', label: 'Rascunho', color: '#64748b' },
              { id: 'scheduled', label: 'Agendado', color: '#b45309' },
              { id: 'fulfilled', label: 'Atendido', color: '#15803d' },
              { id: 'cancelled', label: 'Cancelado', color: '#be123c' }
            ].map(s => (
              <TouchableOpacity
                key={s.id}
                onPress={() => handleStatusUpdate(editingStatusOrder.id, s.id)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, backgroundColor: isDarkMode ? '#334155' : '#f8fafc', marginBottom: 8 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.color }} />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: isDarkMode ? '#f8fafc' : '#1e293b' }}>{s.label}</Text>
                </View>
                {editingStatusOrder?.status === s.id && <Check size={16} color="#2563eb" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal Nativo de Seleção de Tipo de Pedido */}
      <Modal
        visible={showTypeSelectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTypeSelectModal(false)}
      >
        <TouchableOpacity 
          style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }} 
          activeOpacity={1} 
          onPress={() => setShowTypeSelectModal(false)}
        >
          <View style={{ width: '100%', maxWidth: 340, backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#e2e8f0' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#334155' : '#f1f5f9' }}>
              <ClipboardList size={18} color="#2563eb" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 15, fontWeight: '800', color: isDarkMode ? '#f8fafc' : '#0f172a' }}>Selecione o Tipo de Pedido</Text>
            </View>

            <View style={{ gap: 6 }}>
              {[
                { id: 'all', label: 'Todos os Pedidos' },
                { id: 'sale', label: 'Vendas de Produtos' },
                { id: 'budget', label: 'Orçamentos' },
                { id: 'assistance', label: 'Assistências Técnicas' },
                { id: 'return', label: 'Devoluções' }
              ].map((type) => {
                const isSelected = selectedType === type.id;
                return (
                  <TouchableOpacity
                    key={type.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderRadius: 14,
                      backgroundColor: isSelected ? (isDarkMode ? '#1e3a8a' : '#eff6ff') : (isDarkMode ? '#334155' : '#f8fafc'),
                      borderWidth: isSelected ? 1 : 0,
                      borderColor: '#bfdbfe'
                    }}
                    onPress={() => {
                      setSelectedType(type.id);
                      setDisplayCount(25);
                      setShowTypeSelectModal(false);
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: isSelected ? '900' : '700', color: isSelected ? '#2563eb' : (isDarkMode ? '#f8fafc' : '#475569') }}>
                      {type.label}
                    </Text>
                    {isSelected && <Check size={16} color="#2563eb" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// Componente Nativo: Logística / Cronograma de Agendamentos (100% React Native sem WebView)
function NativeLogisticsScreen({ isDarkMode, onSelectOrder }: { isDarkMode: boolean; onSelectOrder?: (order: any) => void }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'default' | 'week' | 'month' | 'all'>('default');
  const [typeFilters, setTypeFilters] = useState<string[]>(['delivery', 'pickup', 'assistance']);
  const [erpSettings, setErpSettings] = useState<any>(null);

  useEffect(() => {
    const fetchRealSettings = async () => {
      try {
        const { data: globalRow } = await supabase
          .from('app_settings')
          .select('*')
          .eq('id', 'global')
          .single();

        if (globalRow?.deliveryHandlingOptions || globalRow?.pickupHandlingOptions) {
          setErpSettings(globalRow);
        } else {
          const { data: settingsData } = await supabase.from('company_settings').select('*').single();
          if (settingsData?.settings) {
            setErpSettings(settingsData.settings);
          }
        }
      } catch (err) {
        console.warn('Erro ao buscar manuseios do ERP em NativeLogisticsScreen:', err);
      }
    };

    fetchRealSettings();
  }, []);

  const fetchLogistics = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (e) {
      console.warn('Erro ao buscar dados de logística nativa:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogistics();

    const channel = supabase
      .channel('realtime-logistics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchLogistics();
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, []);

  const toggleTypeFilter = (type: string) => {
    setTypeFilters(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const { pendingOrders, scheduledTasks } = React.useMemo(() => {
    const pending: any[] = [];
    const scheduled: any[] = [];

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    const endOfWeekStr = endOfWeek.toISOString().split('T')[0];

    (orders || []).forEach(o => {
      const orderData = o.order_data || {};
      if (o.deleted || o.is_deleted || o.status === 'deleted' || o.status === 'cancelled' || orderData.deleted) return;
      const isAssistance = orderData.orderType === 'assistance' || o.order_type === 'assistance';
      const shipping = orderData.shipping || {};
      const isPickup = shipping.deliveryMethod === 'pickup';
      const isDelivery = !isPickup && !isAssistance;

      if (isDelivery && !typeFilters.includes('delivery')) return;
      if (isPickup && !typeFilters.includes('pickup')) return;
      if (isAssistance && !typeFilters.includes('assistance')) return;

      const sched = shipping.scheduling || {};
      const isPending = !!sched.pendingScheduling;
      const rawDate = sched.date || (isAssistance ? (o.scheduled_date || o.created_at) : null);

      // Pedidos em Rascunho (draft) só aparecem se tiverem agendamento preenchido
      const isDraft = o.status === 'draft';
      const hasScheduling = !!(sched.date || isPending || (isAssistance && o.scheduled_date));
      if (isDraft && !hasScheduling) return;

      if (isPending || !rawDate) {
        pending.push(o);
        return;
      }

      const dateClean = rawDate.includes('/') 
        ? rawDate.split('/').reverse().join('-') 
        : rawDate.split('T')[0];

      if (selectedFilter === 'default' && dateClean < yesterdayStr) return;
      if (selectedFilter === 'week' && (dateClean < startOfWeekStr || dateClean > endOfWeekStr)) return;
      if (selectedFilter === 'month' && !dateClean.startsWith(todayStr.substring(0, 7))) return;

      scheduled.push({ ...o, dateClean });
    });

    scheduled.sort((a, b) => a.dateClean.localeCompare(b.dateClean));

    return { pendingOrders: pending, scheduledTasks: scheduled };
  }, [orders, selectedFilter, typeFilters]);

  const groupedScheduledTasks = React.useMemo(() => {
    const groups: { dateClean: string; formattedDate: string; dayOfWeek: string; items: any[] }[] = [];

    (scheduledTasks || []).forEach(task => {
      const dClean = task.dateClean || 'a-definir';
      let grp = groups.find(g => g.dateClean === dClean);
      if (!grp) {
        let dayOfWeekStr = '';
        let formattedDateStr = dClean;
        if (dClean.includes('-')) {
          const parts = dClean.split('-');
          if (parts.length === 3) {
            const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            const rawDay = dt.toLocaleDateString('pt-BR', { weekday: 'long' });
            dayOfWeekStr = rawDay.charAt(0).toUpperCase() + rawDay.slice(1);
            formattedDateStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
          }
        }

        grp = {
          dateClean: dClean,
          formattedDate: formattedDateStr,
          dayOfWeek: dayOfWeekStr,
          items: []
        };
        groups.push(grp);
      }
      grp.items.push(task);
    });

    return groups;
  }, [scheduledTasks]);

  const handleStatusToggle = async (orderId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'fulfilled' ? 'scheduled' : 'fulfilled';
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch (e) {
      Alert.alert('Erro', 'Falha ao atualizar status do agendamento.');
    }
  };

  const [showLogisticsPeriodModal, setShowLogisticsPeriodModal] = useState(false);
  const [isPendingExpanded, setIsPendingExpanded] = useState(false);
  const activeLogisticsPeriodLabel = [
    { id: 'default', label: 'Ontem e Seguintes' },
    { id: 'today', label: 'Hoje' },
    { id: 'week', label: 'Esta Semana' },
    { id: 'month', label: 'Este Mês' },
    { id: 'all', label: 'Todos os Períodos' }
  ].find(f => f.id === selectedFilter)?.label || 'Ontem e Seguintes';

  const renderLogisticsHeader = () => (
    <View style={{ paddingBottom: 6 }}>
      {/* Botão Select de Período Logístico (Igual ao Dashboard) */}
      <View style={{ paddingTop: 12, paddingBottom: 10 }}>
        <TouchableOpacity
          onPress={() => setShowLogisticsPeriodModal(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
            borderWidth: 1,
            borderColor: isDarkMode ? '#334155' : '#cbd5e1',
            borderRadius: 16,
            paddingVertical: 10,
            paddingHorizontal: 14,
            elevation: 2,
            shadowColor: '#2563eb',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 6,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Calendar size={16} color="#2563eb" />
            <Text style={{ fontSize: 12, fontWeight: '800', color: isDarkMode ? '#f8fafc' : '#1e293b' }}>
              Período: {activeLogisticsPeriodLabel}
            </Text>
          </View>
          <ChevronDown size={16} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Chips de Modalidade (Entregas, Retiradas, Assistências) */}
      <View style={{ paddingBottom: 10, flexDirection: 'row', gap: 8 }}>
        {[
          { id: 'delivery', label: 'Entregas', icon: Truck, color: '#16a34a', bg: '#dcfce7' },
          { id: 'pickup', label: 'Retiradas', icon: ShoppingBag, color: '#a855f7', bg: '#f3e8ff' },
          { id: 'assistance', label: 'Assistência', icon: Hammer, color: '#f97316', bg: '#ffedd5' }
        ].map(t => {
          const isActive = typeFilters.includes(t.id);
          const IconComp = t.icon;
          return (
            <TouchableOpacity
              key={t.id}
              onPress={() => toggleTypeFilter(t.id)}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 7,
                borderRadius: 12,
                backgroundColor: isActive ? t.bg : (isDarkMode ? '#1e293b' : '#ffffff'),
                borderWidth: 1,
                borderColor: isActive ? t.color : (isDarkMode ? '#334155' : '#e2e8f0')
              }}
            >
              <IconComp size={14} color={isActive ? t.color : '#94a3b8'} />
              <Text style={{ fontSize: 11, fontWeight: '900', color: isActive ? t.color : (isDarkMode ? '#94a3b8' : '#64748b') }}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Alerta de Agendamentos Pendentes (Fechado/Colapsado por Padrão) */}
      {pendingOrders.length > 0 ? (
        <View style={{
          backgroundColor: isDarkMode ? '#2d1c03' : '#fffbeb',
          borderRadius: 18,
          borderWidth: 1,
          borderColor: isDarkMode ? '#78350f' : '#fef3c7',
          marginBottom: 10,
          overflow: 'hidden'
        }}>
          {/* Cabeçalho Clicável do Tópico de Pendentes */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setIsPendingExpanded(prev => !prev)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 12,
              paddingHorizontal: 14,
              backgroundColor: isDarkMode ? '#3b2204' : '#fef3c7',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <Clock size={18} color="#d97706" />
              <Text style={{ fontSize: 13, fontWeight: '900', color: isDarkMode ? '#fde68a' : '#b45309' }}>
                {pendingOrders.length} {pendingOrders.length === 1 ? 'Agendamento Pendente' : 'Agendamentos Pendentes'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: isDarkMode ? '#78350f' : '#fde68a', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ fontSize: 10, fontWeight: '900', color: isDarkMode ? '#fef3c7' : '#92400e' }}>
                {isPendingExpanded ? 'Ocultar' : 'Ver todos'}
              </Text>
              {isPendingExpanded ? (
                <ChevronUp size={14} color={isDarkMode ? '#fef3c7' : '#92400e'} />
              ) : (
                <ChevronDown size={14} color={isDarkMode ? '#fef3c7' : '#92400e'} />
              )}
            </View>
          </TouchableOpacity>

          {/* Lista Expandida de Pedidos Pendentes */}
          {isPendingExpanded ? (
            <View style={{ padding: 12, gap: 10, borderTopWidth: 1, borderTopColor: isDarkMode ? '#78350f' : '#fde68a' }}>
              {pendingOrders.map((po: any) => {
                const poData = po.order_data || {};
                return (
                  <TouchableOpacity
                    key={po.id}
                    activeOpacity={0.8}
                    onPress={() => onSelectOrder && onSelectOrder(po)}
                    style={{
                      backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                      borderRadius: 12,
                      padding: 10,
                      borderWidth: 1,
                      borderColor: isDarkMode ? '#334155' : '#fde68a',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10, fontWeight: '900', color: '#d97706' }}>#{po.id?.slice(-6).toUpperCase()}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: isDarkMode ? '#f8fafc' : '#1e293b', marginTop: 2 }}>
                        {poData.customerData?.fullName || po.customer_name || 'Cliente'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 9, fontWeight: '900', color: '#dc2626', backgroundColor: isDarkMode ? '#450a0a' : '#fee2e2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, textTransform: 'uppercase' }}>
                      Pendente
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc' }}>
      {/* Lista Nativa de Logística com Tópicos Sticky Fixos no Topo */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={{ marginTop: 12, fontSize: 12, fontWeight: '700', color: '#64748b' }}>Carregando cronograma de logística...</Text>
        </View>
      ) : (
        <SectionList
          sections={groupedScheduledTasks.map(grp => ({
            dateClean: grp.dateClean,
            title: grp.dayOfWeek ? `${grp.dayOfWeek}, ${grp.formattedDate}` : grp.formattedDate,
            count: grp.items.length,
            data: grp.items
          }))}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={true}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchLogistics} colors={['#2563eb']} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}
          ListHeaderComponent={renderLogisticsHeader}
          ListEmptyComponent={
            scheduledTasks.length === 0 && pendingOrders.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 50 }}>
                <Truck size={48} color="#cbd5e1" />
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#64748b', marginTop: 12 }}>Nenhum agendamento encontrado no período</Text>
              </View>
            ) : null
          }
          renderSectionHeader={({ section }) => (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: isDarkMode ? '#1e293b' : '#eff6ff',
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: isDarkMode ? '#334155' : '#bfdbfe',
              marginBottom: 10,
              marginTop: 6,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 4,
              elevation: 3
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Calendar size={15} color="#2563eb" />
                <Text style={{ fontSize: 13, fontWeight: '900', color: isDarkMode ? '#f8fafc' : '#1e3a8a' }}>
                  {section.title}
                </Text>
              </View>
              <View style={{ backgroundColor: '#2563eb', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 }}>
                <Text style={{ fontSize: 10, fontWeight: '900', color: '#ffffff' }}>
                  {section.count} {section.count === 1 ? 'agendamento' : 'agendamentos'}
                </Text>
              </View>
            </View>
          )}
          renderItem={({ item: task }) => {
            const orderData = task.order_data || {};
            const customerName = orderData.customerData?.fullName || task.customer_name || 'Cliente';
            const shipping = orderData.shipping || {};
            const sched = shipping.scheduling || {};
            const displayItems = orderData.items || task.items || orderData.products || task.products || [];

            // Normalização para identificar manuseio dos itens (igual ao ERP)
            const normalizeStr = (str: string) => (str || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

            const deliveryOpts = erpSettings?.deliveryHandlingOptions || [];
            const pickupOpts = erpSettings?.pickupHandlingOptions || [];
            const allOpts = [...deliveryOpts, ...pickupOpts];

            const getItemAssemblyTone = (item: any) => {
              const hLabel = normalizeStr(item?.handlingType || item?.handling_type || item?.handling || '');
              if (!hLabel) return undefined;
              const foundOpt = allOpts.find((opt: any) => typeof opt === 'object' && normalizeStr(opt.label) === hLabel);
              if (foundOpt?.isAssemblyOutside) return 'outside';
              if (foundOpt?.includeInAssemblySchedule) return 'depot';
              if (hLabel.includes('montagem na entrega') || hLabel.includes('montagem fora') || hLabel.includes('montagem no endereco') || hLabel.includes('montagem no local')) return 'outside';
              if (hLabel.includes('montagem no deposito') || hLabel.includes('montagem para retirada') || hLabel.includes('montagem no depósito')) return 'depot';
              return undefined;
            };

            const orderLevelHandling = [
              orderData.handlingType,
              orderData.handling,
              shipping.handlingType,
              shipping.handling,
              task.handling_type,
              task.handling
            ].filter(Boolean).map(String).join(' ');

            const orderAssemblyKind = getItemAssemblyTone({ handlingType: orderLevelHandling });

            const hasItemAssemblyOutside = displayItems.some((item: any) => getItemAssemblyTone(item) === 'outside');
            const hasItemAssemblyDepot = displayItems.some((item: any) => getItemAssemblyTone(item) === 'depot');

            const isAssemblyOutside = orderAssemblyKind === 'outside' || hasItemAssemblyOutside;
            const isAssemblyDepot = orderAssemblyKind === 'depot' || hasItemAssemblyDepot;

            // Rótulo Principal de Logística (Entrega / Retirada / Assistência)
            let primaryTag = 'ENTREGA';
            let primaryBg = '#dcfce7';
            let primaryBorder = '#bbf7d0';
            let primaryColor = '#15803d';

            if (shipping.deliveryMethod === 'pickup') {
              primaryTag = 'RETIRADA';
              primaryBg = '#f3e8ff';
              primaryBorder = '#e9d5ff';
              primaryColor = '#7e22ce';
            } else if (orderData.orderType === 'assistance' || task.order_type === 'assistance') {
              primaryTag = 'ASSISTÊNCIA';
              primaryBg = '#ffedd5';
              primaryBorder = '#fed7aa';
              primaryColor = '#c2410c';
            }

            // Status do Pedido (Badge pílula à direita)
            const orderStatus = task.status || orderData.status || 'scheduled';
            let statusLabel = 'AGENDADO';
            let statusBg = '#fef3c7';
            let statusBorder = '#fde68a';
            let statusColor = '#b45309';

            if (orderStatus === 'fulfilled' || orderStatus === 'completed') {
              statusLabel = 'ATENDIDO';
              statusBg = '#dcfce7';
              statusBorder = '#bbf7d0';
              statusColor = '#15803d';
            } else if (orderStatus === 'cancelled') {
              statusLabel = 'CANCELADO';
              statusBg = '#ffe4e6';
              statusBorder = '#fecdd3';
              statusColor = '#e11d48';
            } else if (orderStatus === 'draft') {
              statusLabel = 'RASCUNHO';
              statusBg = '#f1f5f9';
              statusBorder = '#e2e8f0';
              statusColor = '#64748b';
            }

            // Horário do Agendamento
            let displayTime = 'Horário não definido';
            if (sched.notInformed) displayTime = 'Não informado';
            else if (sched.startTime && sched.endTime) displayTime = `${sched.startTime} - ${sched.endTime}`;
            else if (sched.startTime) displayTime = sched.startTime;
            else if (sched.time) displayTime = sched.time;

            // Endereço sem observação solta
            const deliveryAddr = shipping.deliveryAddress || shipping.address || {};
            const custData = orderData.customerData || orderData.customer || {};
            const custAddr = custData.address || custData.fullAddress || {};

            const street = deliveryAddr.street || deliveryAddr.address || custAddr.street || custAddr.address || '';
            const number = deliveryAddr.number || custAddr.number || '';
            const complement = deliveryAddr.complement || custAddr.complement || '';
            const neighborhood = deliveryAddr.neighborhood || custAddr.neighborhood || '';
            const city = deliveryAddr.city || custAddr.city || '';

            const fullAddrParts = [street, number ? `nº ${number}` : '', complement, neighborhood, city].filter(Boolean);
            const fullAddressClean = fullAddrParts.length > 0 ? fullAddrParts.join(', ') : 'Endereço não informado';

            const distanceKm = shipping.distance ?? shipping.distanceKm ?? task.distance;
            const durationMin = shipping.durationMinutes ?? task.durationMinutes;

            return (
              <TouchableOpacity
                key={task.id}
                activeOpacity={0.8}
                onPress={() => onSelectOrder && onSelectOrder(task)}
                style={{
                  backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                  borderRadius: 20,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 2,
                  marginBottom: 14,
                  gap: 10
                }}
              >
                {/* 1. Topo do Card: Badges de Tipo de Envio + Montagem + SKU */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                    <View style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 20,
                      backgroundColor: isDarkMode ? '#334155' : primaryBg,
                      borderWidth: 1,
                      borderColor: isDarkMode ? '#475569' : primaryBorder
                    }}>
                      <Text style={{ fontSize: 9, fontWeight: '900', color: isDarkMode ? '#f8fafc' : primaryColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {primaryTag}
                      </Text>
                    </View>

                    {isAssemblyOutside && (
                      <View style={{
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 20,
                        backgroundColor: '#ffe4e6',
                        borderWidth: 1,
                        borderColor: '#fecdd3'
                      }}>
                        <Text style={{ fontSize: 9, fontWeight: '900', color: '#e11d48', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          🔨 MONTAGEM FORA
                        </Text>
                      </View>
                    )}

                    {isAssemblyDepot && (
                      <View style={{
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 20,
                        backgroundColor: '#fef3c7',
                        borderWidth: 1,
                        borderColor: '#fde68a'
                      }}>
                        <Text style={{ fontSize: 9, fontWeight: '900', color: '#b45309', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          🔨 MONTAGEM DEPÓSITO
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={{ fontSize: 11, fontWeight: '900', color: isDarkMode ? '#cbd5e1' : '#64748b', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginLeft: 6 }}>
                    #{task.id?.slice(-6).toUpperCase()}
                  </Text>
                </View>

                {/* 2. Segunda Linha: Horário (Esquerda com Ícone de Relógio Verde) + Status Clicável (Direita) */}
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  backgroundColor: isDarkMode ? '#0f172a' : '#f0fdf4',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: isDarkMode ? '#1e293b' : '#dcfce7'
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Clock size={15} color="#16a34a" />
                    <Text style={{ fontSize: 13, fontWeight: '900', color: isDarkMode ? '#f8fafc' : '#14532d' }}>
                      {displayTime}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleStatusToggle(task.id, task.status)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 14,
                      backgroundColor: isDarkMode ? '#334155' : statusBg,
                      borderWidth: 1,
                      borderColor: isDarkMode ? '#475569' : statusBorder,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusColor }} />
                    <Text style={{ fontSize: 9, fontWeight: '900', color: isDarkMode ? '#f8fafc' : statusColor, textTransform: 'uppercase' }}>
                      {statusLabel}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* 3. Nome do Cliente (Caixa Alta / Negrito) */}
                <Text style={{ fontSize: 16, fontWeight: '900', color: isDarkMode ? '#f8fafc' : '#0f172a', letterSpacing: 0.2, textTransform: 'uppercase' }}>
                  {customerName}
                </Text>

                {/* 4. Caixa de Endereço Completo (Sem Observação) */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 8,
                  backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
                  borderRadius: 14,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: isDarkMode ? '#334155' : '#f1f5f9'
                }}>
                  <Text style={{ fontSize: 13 }}>📍</Text>
                  <Text style={{ flex: 1, fontSize: 11, fontWeight: '700', color: isDarkMode ? '#cbd5e1' : '#475569', lineHeight: 16 }}>
                    {fullAddressClean}
                  </Text>
                </View>

                {/* 5. Caixa de Percurso / Distância & Tempo (se disponível) */}
                {(distanceKm !== undefined || durationMin !== undefined) ? (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: isDarkMode ? '#0f172a' : '#f0f9ff',
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderWidth: 1,
                    borderColor: isDarkMode ? '#334155' : '#e0f2fe'
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 12 }}>🗺️</Text>
                      <Text style={{ fontSize: 11, fontWeight: '900', color: isDarkMode ? '#38bdf8' : '#0369a1' }}>
                        {distanceKm !== undefined ? `${Number(distanceKm).toFixed(1)} KM` : 'Percurso'}
                      </Text>
                    </View>
                    {durationMin !== undefined && (
                      <Text style={{ fontSize: 11, fontWeight: '900', color: isDarkMode ? '#38bdf8' : '#0369a1' }}>
                        ~ {durationMin} MIN
                      </Text>
                    )}
                  </View>
                ) : null}

                {/* 6. Chips dos Produtos do Pedido (sem label 'ITENS DO PEDIDO' e com quebra de linha natural) */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
                  {displayItems.map((prodItem: any, idx: number) => {
                    const tone = getItemAssemblyTone(prodItem);
                    let chipBg = isDarkMode ? '#1e293b' : '#ffffff';
                    let chipBorder = isDarkMode ? '#334155' : '#e2e8f0';
                    let qtyColor = '#2563eb';
                    let textColor = isDarkMode ? '#f8fafc' : '#1e293b';

                    if (tone === 'outside') {
                      chipBg = isDarkMode ? '#451a03' : '#fff1f2';
                      chipBorder = isDarkMode ? '#7f1d1d' : '#fecdd3';
                      qtyColor = '#e11d48';
                      textColor = isDarkMode ? '#fecdd3' : '#991b1b';
                    } else if (tone === 'depot') {
                      chipBg = isDarkMode ? '#3f2c06' : '#fffbeb';
                      chipBorder = isDarkMode ? '#78350f' : '#fde68a';
                      qtyColor = '#d97706';
                      textColor = isDarkMode ? '#fef08a' : '#92400e';
                    }

                    const rawName = prodItem.description || prodItem.name || prodItem.productName || prodItem.title || 'Produto sem nome';
                    const itemQty = prodItem.quantity || prodItem.qty || 1;

                    return (
                      <View
                        key={idx}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 10,
                          backgroundColor: chipBg,
                          borderWidth: 1,
                          borderColor: chipBorder,
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.03,
                          shadowRadius: 2,
                          elevation: 1
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '900', color: qtyColor }}>
                          {itemQty}x
                        </Text>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: textColor, textTransform: 'uppercase' }}>
                          {rawName}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Modal de Seleção de Período de Logística */}
      <Modal
        visible={showLogisticsPeriodModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogisticsPeriodModal(false)}
      >
        <TouchableOpacity 
          style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }} 
          activeOpacity={1} 
          onPress={() => setShowLogisticsPeriodModal(false)}
        >
          <View style={{ width: '100%', maxWidth: 340, backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#e2e8f0' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#334155' : '#f1f5f9' }}>
              <Calendar size={18} color="#2563eb" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 15, fontWeight: '800', color: isDarkMode ? '#f8fafc' : '#0f172a' }}>Selecione o Período Logístico</Text>
            </View>

            <View style={{ gap: 6 }}>
              {[
                { id: 'default', label: 'Ontem e Seguintes' },
                { id: 'today', label: 'Hoje' },
                { id: 'week', label: 'Esta Semana' },
                { id: 'month', label: 'Este Mês' },
                { id: 'all', label: 'Todos os Períodos' }
              ].map((period) => {
                const isSelected = selectedFilter === period.id;
                return (
                  <TouchableOpacity
                    key={period.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderRadius: 14,
                      backgroundColor: isSelected ? (isDarkMode ? '#1e3a8a' : '#eff6ff') : (isDarkMode ? '#334155' : '#f8fafc'),
                      borderWidth: isSelected ? 1 : 0,
                      borderColor: '#bfdbfe'
                    }}
                    onPress={() => {
                      setSelectedFilter(period.id as any);
                      setShowLogisticsPeriodModal(false);
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: isSelected ? '900' : '700', color: isSelected ? '#2563eb' : (isDarkMode ? '#f8fafc' : '#475569') }}>
                      {period.label}
                    </Text>
                    {isSelected && <Check size={16} color="#2563eb" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// Componente Nativo: Montagens / Cronograma de Montagens no Depósito (100% React Native sem WebView)
function NativeAssembliesScreen({ isDarkMode, onSelectOrder }: { isDarkMode: boolean; onSelectOrder?: (order: any) => void }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'default' | 'today' | 'week' | 'month' | 'all'>('default');
  const [showAssemblyPeriodModal, setShowAssemblyPeriodModal] = useState(false);
  const [erpSettings, setErpSettings] = useState<any>(null);

  // Estado das Sub-Abas de Montagens: 'internal' (No Depósito) vs 'outside' (Montagens Fora)
  const [activeAssemblySubTab, setActiveAssemblySubTab] = useState<'internal' | 'outside'>('internal');
  const [internalHandlingLabels, setInternalHandlingLabels] = useState<string[]>([
    'Na caixa > Montagem no deposito > Entregue montado',
    'De caixa > Montagem para retirada'
  ]);
  const [outsideHandlingLabels, setOutsideHandlingLabels] = useState<string[]>([
    'De mostruário > Desmontagem do mostruário > Montagem na entrega'
  ]);

  useEffect(() => {
    const fetchRealSettings = async () => {
      try {
        const { data } = await supabase.from('settings').select('*').eq('id', 'app').single();
        if (data) {
          setErpSettings(data);
          const deliveryOpts = data.deliveryHandlingOptions || [];
          const pickupOpts = data.pickupHandlingOptions || [];
          const combined = [...deliveryOpts, ...pickupOpts];

          const internalFiltered = combined
            .filter((opt: any) => typeof opt === 'object' && opt.includeInAssemblySchedule && !opt.isAssemblyOutside)
            .map((opt: any) => opt.label)
            .filter((lbl: string, idx: number, self: string[]) => self.indexOf(lbl) === idx);

          const outsideFiltered = combined
            .filter((opt: any) => typeof opt === 'object' && opt.isAssemblyOutside)
            .map((opt: any) => opt.label)
            .filter((lbl: string, idx: number, self: string[]) => self.indexOf(lbl) === idx);

          if (internalFiltered.length > 0) setInternalHandlingLabels(internalFiltered);
          if (outsideFiltered.length > 0) setOutsideHandlingLabels(outsideFiltered);
        }
      } catch (err) {
        console.warn('Erro ao buscar manuseios do ERP:', err);
      }
    };

    fetchRealSettings();
  }, []);

  const fetchAssemblies = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (e) {
      console.warn('Erro ao buscar montagens nativas:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAssemblies();

    const channel = supabase
      .channel('realtime-native-assemblies')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchAssemblies();
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, []);

  // Processa pedidos e filtra itens segundo a Sub-Aba selecionada (Depósito vs Fora)
  const { groupedAssemblyTasks, totalAssemblyCount } = React.useMemo(() => {
    const normalize = (str: string) => (str || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const deliveryOpts = erpSettings?.deliveryHandlingOptions || [];
    const pickupOpts = erpSettings?.pickupHandlingOptions || [];
    const allOpts = [...deliveryOpts, ...pickupOpts];

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    const endOfWeekStr = endOfWeek.toISOString().split('T')[0];

    const tasks: any[] = [];

    (orders || []).forEach(o => {
      const orderData = o.order_data || {};
      if (o.deleted || o.is_deleted || o.status === 'deleted' || o.status === 'cancelled' || orderData.deleted) return;

      const isShowroom = orderData.orderType === 'showroom' || o.order_type === 'showroom';
      const items = orderData.items || o.items || [];
      const shipping = orderData.shipping || {};

      // Filtra os itens segundo a Sub-Aba ativa
      const assemblyItems = items.filter((i: any) => {
        const hLabel = normalize(i.handlingType || i.handling_type || i.handling || '');
        if (!hLabel) return false;

        const isPickup = shipping.deliveryMethod === 'pickup';
        const modalityOptions = isPickup ? pickupOpts : deliveryOpts;

        const opt = modalityOptions.find((optObj: any) => typeof optObj === 'object' && normalize(optObj.label) === hLabel)
          || allOpts.find((optObj: any) => typeof optObj === 'object' && normalize(optObj.label) === hLabel);

        if (activeAssemblySubTab === 'internal') {
          if (opt) {
            return !!(opt.includeInAssemblySchedule && !opt.isAssemblyOutside);
          }
          return hLabel.includes('montagem no deposito') || hLabel.includes('montagem para retirada');
        } else {
          // Sub-aba Montagens Fora
          if (opt) {
            return !!opt.isAssemblyOutside;
          }
          return hLabel.includes('montagem na entrega') || hLabel.includes('montagem fora');
        }
      });

      const isInternalTab = activeAssemblySubTab === 'internal';
      if (assemblyItems.length === 0 && !(isInternalTab && isShowroom)) return;

      const sched = shipping.scheduling || {};
      const rawDeadline = isShowroom 
        ? (orderData.showcaseDate || orderData.deadlineDate || sched.date || o.created_at)
        : (sched.date || o.scheduled_date || o.created_at);

      if (!rawDeadline) return;

      const dateClean = rawDeadline.includes('/') 
        ? rawDeadline.split('/').reverse().join('-') 
        : rawDeadline.split('T')[0];

      // Filtro por Período
      if (selectedFilter === 'default' && dateClean < yesterdayStr) return;
      if (selectedFilter === 'today' && dateClean !== todayStr) return;
      if (selectedFilter === 'week' && (dateClean < startOfWeekStr || dateClean > endOfWeekStr)) return;
      if (selectedFilter === 'month' && !dateClean.startsWith(todayStr.substring(0, 7))) return;

      tasks.push({
        ...o,
        dateClean,
        isShowroom,
        assemblyItems: assemblyItems.length > 0 ? assemblyItems : items
      });
    });

    tasks.sort((a, b) => a.dateClean.localeCompare(b.dateClean));

    // Agrupa por data para os Tópicos Flutuantes de Data e Dia da Semana
    const groups: { dateClean: string; formattedDate: string; dayOfWeek: string; items: any[] }[] = [];

    tasks.forEach(task => {
      const dClean = task.dateClean || 'a-definir';
      let grp = groups.find(g => g.dateClean === dClean);
      if (!grp) {
        let dayOfWeekStr = '';
        let formattedDateStr = dClean;
        if (dClean.includes('-')) {
          const parts = dClean.split('-');
          if (parts.length === 3) {
            const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            const rawDay = dt.toLocaleDateString('pt-BR', { weekday: 'long' });
            dayOfWeekStr = rawDay.charAt(0).toUpperCase() + rawDay.slice(1);
            formattedDateStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
          }
        }

        grp = {
          dateClean: dClean,
          formattedDate: formattedDateStr,
          dayOfWeek: dayOfWeekStr,
          items: []
        };
        groups.push(grp);
      }
      grp.items.push(task);
    });

    return { groupedAssemblyTasks: groups, totalAssemblyCount: tasks.length };
  }, [orders, selectedFilter, erpSettings, activeAssemblySubTab]);

  const activePeriodLabel = [
    { id: 'default', label: 'Ontem e Seguintes' },
    { id: 'today', label: 'Hoje' },
    { id: 'week', label: 'Esta Semana' },
    { id: 'month', label: 'Este Mês' },
    { id: 'all', label: 'Todos os Períodos' }
  ].find(f => f.id === selectedFilter)?.label || 'Ontem e Seguintes';

  const renderAssemblyHeader = () => (
    <View style={{ paddingBottom: 6 }}>
      {/* Seletor de Sub-Abas: Montagens Depósito vs Montagens Fora */}
      <View style={{ flexDirection: 'row', gap: 8, paddingTop: 12, paddingBottom: 6 }}>
        <TouchableOpacity
          onPress={() => setActiveAssemblySubTab('internal')}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            paddingVertical: 9,
            borderRadius: 14,
            backgroundColor: activeAssemblySubTab === 'internal' 
              ? (isDarkMode ? '#1e3a8a' : '#fefce8') 
              : (isDarkMode ? '#1e293b' : '#ffffff'),
            borderWidth: 1.5,
            borderColor: activeAssemblySubTab === 'internal' ? '#eab308' : (isDarkMode ? '#334155' : '#e2e8f0'),
            elevation: activeAssemblySubTab === 'internal' ? 2 : 0
          }}
        >
          <Hammer size={16} color="#eab308" />
          <Text style={{ fontSize: 12, fontWeight: '900', color: activeAssemblySubTab === 'internal' ? (isDarkMode ? '#f8fafc' : '#ca8a04') : (isDarkMode ? '#94a3b8' : '#64748b') }}>
            No Depósito
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveAssemblySubTab('outside')}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            paddingVertical: 9,
            borderRadius: 14,
            backgroundColor: activeAssemblySubTab === 'outside' 
              ? (isDarkMode ? '#451a03' : '#fff1f2') 
              : (isDarkMode ? '#1e293b' : '#ffffff'),
            borderWidth: 1.5,
            borderColor: activeAssemblySubTab === 'outside' ? '#ef4444' : (isDarkMode ? '#334155' : '#e2e8f0'),
            elevation: activeAssemblySubTab === 'outside' ? 2 : 0
          }}
        >
          <Hammer size={16} color="#ef4444" />
          <Text style={{ fontSize: 12, fontWeight: '900', color: activeAssemblySubTab === 'outside' ? (isDarkMode ? '#f8fafc' : '#be123c') : (isDarkMode ? '#94a3b8' : '#64748b') }}>
            Montagens Fora
          </Text>
        </TouchableOpacity>
      </View>

      {/* Título & Manuseios Reais das Configurações do ERP */}
      <View style={{ paddingTop: 8, paddingBottom: 6, gap: 6 }}>
        <Text style={{ fontSize: 18, fontWeight: '900', color: isDarkMode ? '#f8fafc' : '#0f172a', letterSpacing: 0.2 }}>
          {activeAssemblySubTab === 'internal' ? 'Montagens no Depósito / Mostruário' : 'Montagens Fora / Na Entrega'}
        </Text>

        <View style={{ gap: 4, marginTop: 2 }}>
          {activeAssemblySubTab === 'internal' ? (
            <>
              {internalHandlingLabels.map((label, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#c2410c' }} />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: isDarkMode ? '#f8fafc' : '#c2410c' }}>
                    {label}
                  </Text>
                </View>
              ))}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#b45309' }} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: isDarkMode ? '#f8fafc' : '#b45309' }}>
                  Produtos para Mostruário da Loja
                </Text>
              </View>
            </>
          ) : (
            <>
              {outsideHandlingLabels.map((label, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#dc2626' }} />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: isDarkMode ? '#f8fafc' : '#dc2626' }}>
                    {label}
                  </Text>
                </View>
              ))}
            </>
          )}
        </View>
      </View>

      {/* Botão Select de Período de Montagem (Igual ao Dashboard) */}
      <View style={{ paddingTop: 8, paddingBottom: 10 }}>
        <TouchableOpacity
          onPress={() => setShowAssemblyPeriodModal(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
            borderWidth: 1,
            borderColor: isDarkMode ? '#334155' : '#cbd5e1',
            borderRadius: 16,
            paddingVertical: 10,
            paddingHorizontal: 14,
            elevation: 2,
            shadowColor: '#2563eb',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 6,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Calendar size={16} color="#2563eb" />
            <Text style={{ fontSize: 12, fontWeight: '800', color: isDarkMode ? '#f8fafc' : '#1e293b' }}>
              Período: {activePeriodLabel}
            </Text>
          </View>
          <ChevronDown size={16} color="#64748b" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc' }}>
      {/* Lista Nativa de Montagens com Tópicos Sticky Fixos no Topo */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={{ marginTop: 12, fontSize: 12, fontWeight: '700', color: '#64748b' }}>Carregando cronograma de montagens...</Text>
        </View>
      ) : (
        <SectionList
          sections={groupedAssemblyTasks.map(grp => ({
            dateClean: grp.dateClean,
            title: grp.dayOfWeek ? `${grp.dayOfWeek}, ${grp.formattedDate}` : grp.formattedDate,
            count: grp.items.length,
            data: grp.items
          }))}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={true}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchAssemblies} colors={['#2563eb']} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}
          ListHeaderComponent={renderAssemblyHeader}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 50 }}>
              <Hammer size={48} color="#cbd5e1" />
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#64748b', marginTop: 12 }}>Nenhuma montagem pendente no período</Text>
            </View>
          }
          renderSectionHeader={({ section }) => (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: isDarkMode ? '#1e293b' : '#fff7ed',
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: isDarkMode ? '#334155' : '#ffedd5',
              marginBottom: 10,
              marginTop: 6,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 4,
              elevation: 3
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Calendar size={15} color="#f97316" />
                <Text style={{ fontSize: 13, fontWeight: '900', color: isDarkMode ? '#f8fafc' : '#9a3412' }}>
                  {section.title}
                </Text>
              </View>
              <View style={{ backgroundColor: '#f97316', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 }}>
                <Text style={{ fontSize: 10, fontWeight: '900', color: '#ffffff' }}>
                  {section.count} {section.count === 1 ? 'montagem' : 'montagens'}
                </Text>
              </View>
            </View>
          )}
          renderItem={({ item: task }) => {
            const orderData = task.order_data || {};
            const customerName = orderData.customerData?.fullName || task.customer_name || (task.isShowroom ? 'Mostruário da Loja' : 'Consumidor');
            const shipping = orderData.shipping || {};
            const sched = shipping.scheduling || {};
            const displayItems = task.assemblyItems || orderData.items || task.items || [];

            // Normalização para identificar manuseio dos itens (igual ao ERP)
            const normalizeStr = (str: string) => (str || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

            const deliveryOpts = erpSettings?.deliveryHandlingOptions || [];
            const pickupOpts = erpSettings?.pickupHandlingOptions || [];
            const allOpts = [...deliveryOpts, ...pickupOpts];

            const getItemAssemblyTone = (item: any) => {
              const hLabel = normalizeStr(item?.handlingType || item?.handling_type || item?.handling || '');
              if (!hLabel) return undefined;
              const foundOpt = allOpts.find((opt: any) => typeof opt === 'object' && normalizeStr(opt.label) === hLabel);
              if (foundOpt?.isAssemblyOutside) return 'outside';
              if (foundOpt?.includeInAssemblySchedule) return 'depot';
              if (hLabel.includes('montagem na entrega') || hLabel.includes('montagem fora') || hLabel.includes('montagem no endereco') || hLabel.includes('montagem no local')) return 'outside';
              if (hLabel.includes('montagem no deposito') || hLabel.includes('montagem para retirada') || hLabel.includes('montagem no depósito')) return 'depot';
              return undefined;
            };

            const orderLevelHandling = [
              orderData.handlingType,
              orderData.handling,
              shipping.handlingType,
              shipping.handling,
              task.handling_type,
              task.handling
            ].filter(Boolean).map(String).join(' ');

            const orderAssemblyKind = getItemAssemblyTone({ handlingType: orderLevelHandling });

            const hasItemAssemblyOutside = displayItems.some((item: any) => getItemAssemblyTone(item) === 'outside');
            const hasItemAssemblyDepot = displayItems.some((item: any) => getItemAssemblyTone(item) === 'depot');

            const isAssemblyOutside = orderAssemblyKind === 'outside' || hasItemAssemblyOutside;
            const isAssemblyDepot = orderAssemblyKind === 'depot' || hasItemAssemblyDepot;
            const isOnlyInternalAssembly = isAssemblyDepot;

            // Rótulo Principal de Logística (Entrega / Retirada / Assistência)
            let primaryTag = 'ENTREGA';
            let primaryBg = '#dcfce7';
            let primaryBorder = '#bbf7d0';
            let primaryColor = '#15803d';

            if (shipping.deliveryMethod === 'pickup') {
              primaryTag = 'RETIRADA';
              primaryBg = '#f3e8ff';
              primaryBorder = '#e9d5ff';
              primaryColor = '#7e22ce';
            } else if (orderData.orderType === 'assistance') {
              primaryTag = 'ASSISTÊNCIA';
              primaryBg = '#ffedd5';
              primaryBorder = '#fed7aa';
              primaryColor = '#c2410c';
            }

            // Status do Pedido (Badge pílula à direita)
            const orderStatus = task.status || orderData.status || 'scheduled';
            let statusLabel = 'AGENDADO';
            let statusBg = '#fef3c7';
            let statusBorder = '#fde68a';
            let statusColor = '#b45309';

            if (orderStatus === 'fulfilled' || orderStatus === 'completed') {
              statusLabel = 'ATENDIDO';
              statusBg = '#dcfce7';
              statusBorder = '#bbf7d0';
              statusColor = '#15803d';
            } else if (orderStatus === 'cancelled') {
              statusLabel = 'CANCELADO';
              statusBg = '#ffe4e6';
              statusBorder = '#fecdd3';
              statusColor = '#e11d48';
            } else if (orderStatus === 'draft') {
              statusLabel = 'RASCUNHO';
              statusBg = '#f1f5f9';
              statusBorder = '#e2e8f0';
              statusColor = '#64748b';
            }

            // Horário do Agendamento
            let displayTime = 'Horário não definido';
            if (sched.startTime && sched.endTime) {
              displayTime = `${sched.startTime} - ${sched.endTime}`;
            } else if (sched.startTime || sched.time) {
              displayTime = sched.startTime || sched.time;
            }

            // Endereço sem observação solta
            const deliveryAddr = shipping.deliveryAddress || shipping.address || {};
            const custData = orderData.customerData || orderData.customer || {};
            const custAddr = custData.address || custData.fullAddress || {};

            const street = deliveryAddr.street || deliveryAddr.address || custAddr.street || custAddr.address || '';
            const number = deliveryAddr.number || custAddr.number || '';
            const complement = deliveryAddr.complement || custAddr.complement || '';
            const neighborhood = deliveryAddr.neighborhood || custAddr.neighborhood || '';
            const city = deliveryAddr.city || custAddr.city || '';

            const fullAddrParts = [street, number ? `nº ${number}` : '', complement, neighborhood, city].filter(Boolean);
            const fullAddressClean = fullAddrParts.length > 0 ? fullAddrParts.join(', ') : 'Endereço não informado';

            const distanceKm = shipping.distance ?? shipping.distanceKm ?? task.distance;
            const durationMin = shipping.durationMinutes ?? task.durationMinutes;

            return (
              <TouchableOpacity
                key={task.id}
                activeOpacity={0.8}
                onPress={() => onSelectOrder && onSelectOrder(task)}
                style={{
                  backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.06,
                  shadowRadius: 8,
                  elevation: 2,
                  marginBottom: 14,
                  overflow: 'hidden',
                  borderLeftWidth: 5,
                  borderLeftColor: isAssemblyOutside ? '#e11d48'
                    : isAssemblyDepot ? '#d97706'
                    : primaryColor,
                }}
              >
                {/* ═══ HEADER COLORIDO com todos os badges ═══ */}
                <View style={{
                  backgroundColor: isDarkMode ? '#0f172a' : primaryBg,
                  borderBottomWidth: 1,
                  borderBottomColor: isDarkMode ? '#1e293b' : primaryBorder,
                  paddingHorizontal: 14,
                  paddingTop: 12,
                  paddingBottom: 10,
                  gap: 8,
                }}>
                  {/* Linha 1: Badge de tipo + ID */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    {/* Badges de Tipo de Envio + Montagem */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                      <View style={{
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 20,
                        backgroundColor: isDarkMode ? '#1e293b' : primaryBorder,
                        borderWidth: 1,
                        borderColor: isDarkMode ? '#334155' : primaryColor + '40',
                      }}>
                        <Text style={{ fontSize: 9, fontWeight: '900', color: isDarkMode ? '#f8fafc' : primaryColor, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                          {primaryTag}
                        </Text>
                      </View>

                      {isAssemblyOutside && (
                        <View style={{
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 20,
                          backgroundColor: '#ffe4e6',
                          borderWidth: 1,
                          borderColor: '#fecdd3'
                        }}>
                          <Text style={{ fontSize: 9, fontWeight: '900', color: '#e11d48', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                            🔨 MONTAGEM FORA
                          </Text>
                        </View>
                      )}

                      {isAssemblyDepot && (
                        <View style={{
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 20,
                          backgroundColor: '#fef3c7',
                          borderWidth: 1,
                          borderColor: '#fde68a'
                        }}>
                          <Text style={{ fontSize: 9, fontWeight: '900', color: '#b45309', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                            🔨 MONTAGEM DEPÓSITO
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* ID + Status */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 10, fontWeight: '900', color: isDarkMode ? '#94a3b8' : '#64748b', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                        #{task.id?.slice(-6).toUpperCase()}
                      </Text>
                      {/* Badge de Status */}
                      <View style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 12,
                        backgroundColor: isDarkMode ? '#334155' : statusBg,
                        borderWidth: 1,
                        borderColor: isDarkMode ? '#475569' : statusBorder,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      }}>
                        <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: statusColor }} />
                        <Text style={{ fontSize: 8, fontWeight: '900', color: isDarkMode ? '#f8fafc' : statusColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {statusLabel}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Linha 2: Badges secundários de montagem */}
                  {(isAssemblyOutside || isOnlyInternalAssembly) && (
                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                      {isAssemblyOutside && (
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 10,
                          backgroundColor: isDarkMode ? '#7f1d1d' : '#fee2e2',
                          borderWidth: 1,
                          borderColor: isDarkMode ? '#991b1b' : '#fca5a5',
                        }}>
                          <Text style={{ fontSize: 9 }}>🔨</Text>
                          <Text style={{ fontSize: 8, fontWeight: '900', color: isDarkMode ? '#fecdd3' : '#b91c1c', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Montagem Fora
                          </Text>
                        </View>
                      )}
                      {isOnlyInternalAssembly && !isAssemblyOutside && (
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 10,
                          backgroundColor: isDarkMode ? '#78350f' : '#fef3c7',
                          borderWidth: 1,
                          borderColor: isDarkMode ? '#92400e' : '#fde68a',
                        }}>
                          <Text style={{ fontSize: 9 }}>🔧</Text>
                          <Text style={{ fontSize: 8, fontWeight: '900', color: isDarkMode ? '#fef08a' : '#92400e', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Montagem Depósito
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                {/* ═══ CORPO NEUTRO ═══ */}
                <View style={{ padding: 14, gap: 10 }}>
                  {/* Horário */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    backgroundColor: isDarkMode ? '#0f172a' : '#f0fdf4',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: isDarkMode ? '#1e293b' : '#dcfce7',
                    alignSelf: 'flex-start',
                  }}>
                    <Clock size={13} color="#16a34a" />
                    <Text style={{ fontSize: 13, fontWeight: '900', color: isDarkMode ? '#f8fafc' : '#14532d' }}>
                      {displayTime}
                    </Text>
                  </View>

                  {/* Nome do Cliente */}
                  <Text style={{ fontSize: 16, fontWeight: '900', color: isDarkMode ? '#f8fafc' : '#0f172a', letterSpacing: 0.2, textTransform: 'uppercase' }}>
                    {customerName}
                  </Text>

                  {/* Endereço */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 8,
                    backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
                    borderRadius: 14,
                    padding: 10,
                    borderWidth: 1,
                    borderColor: isDarkMode ? '#334155' : '#f1f5f9',
                  }}>
                    <Text style={{ fontSize: 13 }}>📍</Text>
                    <Text style={{ flex: 1, fontSize: 11, fontWeight: '700', color: isDarkMode ? '#cbd5e1' : '#475569', lineHeight: 16 }}>
                      {fullAddressClean}
                    </Text>
                  </View>

                  {/* Percurso / Distância */}
                  {(distanceKm !== undefined || durationMin !== undefined) ? (
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: isDarkMode ? '#0f172a' : '#f0f9ff',
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderWidth: 1,
                      borderColor: isDarkMode ? '#334155' : '#e0f2fe',
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 12 }}>🗺️</Text>
                        <Text style={{ fontSize: 11, fontWeight: '900', color: isDarkMode ? '#38bdf8' : '#0369a1' }}>
                          {distanceKm !== undefined ? `${Number(distanceKm).toFixed(1)} KM` : 'Percurso'}
                        </Text>
                      </View>
                      {durationMin !== undefined && (
                        <Text style={{ fontSize: 11, fontWeight: '900', color: isDarkMode ? '#38bdf8' : '#0369a1' }}>
                          ~ {durationMin} MIN
                        </Text>
                      )}
                    </View>
                  ) : null}

                  {/* Chips de Produtos */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
                    {displayItems.map((prodItem: any, idx: number) => {
                      const tone = getItemAssemblyTone(prodItem);
                      let chipBg = isDarkMode ? '#1e293b' : '#ffffff';
                      let chipBorder = isDarkMode ? '#334155' : '#e2e8f0';
                      let qtyColor = '#2563eb';
                      let textColor = isDarkMode ? '#f8fafc' : '#1e293b';

                      if (tone === 'outside') {
                        chipBg = isDarkMode ? '#451a03' : '#fff1f2';
                        chipBorder = isDarkMode ? '#7f1d1d' : '#fecdd3';
                        qtyColor = '#e11d48';
                        textColor = isDarkMode ? '#fecdd3' : '#991b1b';
                      } else if (tone === 'depot') {
                        chipBg = isDarkMode ? '#3f2c06' : '#fffbeb';
                        chipBorder = isDarkMode ? '#78350f' : '#fde68a';
                        qtyColor = '#d97706';
                        textColor = isDarkMode ? '#fef08a' : '#92400e';
                      }

                      const rawName = prodItem.description || prodItem.name || prodItem.productName || 'Produto sem nome';
                      const itemQty = prodItem.quantity || prodItem.qty || 1;

                      return (
                        <View
                          key={idx}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 10,
                            backgroundColor: chipBg,
                            borderWidth: 1,
                            borderColor: chipBorder,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.03,
                            shadowRadius: 2,
                            elevation: 1,
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '900', color: qtyColor }}>
                            {itemQty}x
                          </Text>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: textColor, textTransform: 'uppercase' }}>
                            {rawName}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Modal Nativo de Seleção de Período para Montagens */}
      <Modal
        visible={showAssemblyPeriodModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAssemblyPeriodModal(false)}
      >
        <TouchableOpacity 
          style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }} 
          activeOpacity={1} 
          onPress={() => setShowAssemblyPeriodModal(false)}
        >
          <View style={{ width: '100%', maxWidth: 340, backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#e2e8f0' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#334155' : '#f1f5f9' }}>
              <Calendar size={18} color="#2563eb" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 15, fontWeight: '800', color: isDarkMode ? '#f8fafc' : '#0f172a' }}>Selecione o Período</Text>
            </View>

            <View style={{ gap: 6 }}>
              {[
                { id: 'default', label: 'Ontem e Seguintes' },
                { id: 'today', label: 'Hoje' },
                { id: 'week', label: 'Esta Semana' },
                { id: 'month', label: 'Este Mês' },
                { id: 'all', label: 'Todos os Períodos' }
              ].map((period) => {
                const isSelected = selectedFilter === period.id;
                return (
                  <TouchableOpacity
                    key={period.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderRadius: 14,
                      backgroundColor: isSelected ? (isDarkMode ? '#1e3a8a' : '#eff6ff') : (isDarkMode ? '#334155' : '#f8fafc'),
                      borderWidth: isSelected ? 1 : 0,
                      borderColor: '#bfdbfe'
                    }}
                    onPress={() => {
                      setSelectedFilter(period.id as any);
                      setShowAssemblyPeriodModal(false);
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: isSelected ? '900' : '700', color: isSelected ? '#2563eb' : (isDarkMode ? '#f8fafc' : '#475569') }}>
                      {period.label}
                    </Text>
                    {isSelected && <Check size={16} color="#2563eb" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// Componente Nativo: Relatórios (100% React Native sem WebView)
function NativeReportsScreen({ isDarkMode }: { isDarkMode: boolean }) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc', padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: '900', color: isDarkMode ? '#f8fafc' : '#0f172a', marginBottom: 16 }}>
        Relatórios & Performance
      </Text>
      <View style={{ backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#f1f5f9', gap: 12 }}>
        <Text style={{ fontSize: 12, fontWeight: '800', color: '#2563eb', textTransform: 'uppercase' }}>Métricas Sincronizadas</Text>
        <Text style={{ fontSize: 24, fontWeight: '900', color: isDarkMode ? '#f8fafc' : '#0f172a' }}>100% Nativo</Text>
        <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748b' }}>Aplicativo operando com componentes nativos do React Native.</Text>
      </View>
    </ScrollView>
  );
}

export default function App() {
  const [userProfile, setUserProfile] = useState<any>(MASTER_DEFAULT_PROFILE);
  const [currentTab, setCurrentTab] = useState('home');
  const [webViewUrl, setWebViewUrl] = useState(`${WEB_URL}/mobile-orders`);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Estados de Tema e Modal de Perfil
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [appSelectedOrder, setAppSelectedOrder] = useState<any>(null);

  // Estados do Dashboard e Métricas por Período
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [deliveriesCount, setDeliveriesCount] = useState(0);
  const [assembliesInternalCount, setAssembliesInternalCount] = useState(0);
  const [assembliesOutsideCount, setAssembliesOutsideCount] = useState(0);
  const [assistancesCount, setAssistancesCount] = useState(0);
  const [returnsCount, setReturnsCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(false);
  const webViewRef = useRef<WebView>(null);

  // Estados para o Resumo Inteligente de Entregas via IA Gemini
  const [aiSummaryTab, setAiSummaryTab] = useState<'today' | 'tomorrow'>('today');
  const [aiSummaryToday, setAiSummaryToday] = useState<string>('');
  const [aiSummaryTomorrow, setAiSummaryTomorrow] = useState<string>('');
  const [isGeneratingAISummary, setIsGeneratingAISummary] = useState(false);
  const [isSpeakingSummary, setIsSpeakingSummary] = useState(false);

  // Calcula os dias restantes da semana corrente a partir de amanhã até o próximo domingo
  const getRestOfWeekDates = () => {
    const dates: string[] = [];
    const now = new Date();
    const cur = new Date(now);
    cur.setDate(cur.getDate() + 1); // a partir de amanhã

    const dayOfWeek = now.getDay(); // 0 = Dom, 1 = Seg...
    const daysUntilSunday = 7 - (dayOfWeek === 0 ? 7 : dayOfWeek);
    
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + Math.max(1, daysUntilSunday));
    const endOfWeekStr = endOfWeek.toISOString().split('T')[0];

    while (cur <= endOfWeek) {
      const dStr = cur.toISOString().split('T')[0];
      dates.push(dStr);
      cur.setDate(cur.getDate() + 1);
    }

    if (dates.length === 0) {
      // Fallback para os próximos dias se já for fim de semana
      for (let i = 1; i <= 5; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() + i);
        dates.push(d.toISOString().split('T')[0]);
      }
    }
    return dates;
  };

  // Gerador Inteligente de Resumo Operacional (Gemini API + Local Structured Fallback com Cache Persistente)
  const generateDeliveryAISummary = async (mode: 'today' | 'tomorrow', forceRefresh: boolean = false) => {
    try {
      // Busca dados dos pedidos e configurações do sistema de forma segura com fallback
      const { data: rawOrders } = await supabase.from('orders').select('*').order('created_at', { ascending: false });

      // Fingerprint dos pedidos (IDs, data de atualização/criação, status, exclusão e dados do pedido)
      const currentFingerprint = (rawOrders || []).map((o: any) => 
        `${o.id}_${o.updated_at || o.created_at || ''}_${o.status || ''}_${o.deleted || ''}_${JSON.stringify(o.order_data || {})}`
      ).join('|');

      const cacheKey = mode === 'today' ? '@morante_ai_summary_today' : '@morante_ai_summary_tomorrow';
      const fpKey = `@morante_ai_summary_fingerprint_${mode}`;

      if (!forceRefresh) {
        const [cachedText, storedFp] = await Promise.all([
          AsyncStorage.getItem(cacheKey),
          AsyncStorage.getItem(fpKey)
        ]);

        if (cachedText && storedFp === currentFingerprint) {
          if (mode === 'today') setAiSummaryToday(cachedText);
          else if (mode === 'tomorrow') setAiSummaryTomorrow(cachedText);
          return; // Retorna imediatamente sem chamar a IA nem gastar cota!
        }
      }

      setIsGeneratingAISummary(true);

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      let targetDates: string[] = [todayStr];
      let periodLabel = 'para hoje';

      if (mode === 'today') {
        targetDates = [todayStr];
        periodLabel = 'para hoje';
      } else if (mode === 'tomorrow') {
        targetDates = [tomorrowStr];
        periodLabel = 'para amanhã';
      }

      let settingsData: any = null;
      try {
        const { data } = await supabase.from('settings').select('*').eq('id', 'app').maybeSingle();
        settingsData = data;
      } catch (e) {
        console.warn('Configurações não encontradas ou erro ao carregar:', e);
      }

      const geminiKey = settingsData?.geminiApiKey || process.env.VITE_GEMINI_API_KEY || '';
      const handlingOptions: any[] = settingsData?.handlingOptions || settingsData?.orderTypes || [];

      // Função auxiliar para verificar se a modalidade/manuseio REALMENTE é montagem fora/no local da entrega
      const isAssemblyOutsideType = (handlingTypeStr: string) => {
        if (!handlingTypeStr) return false;
        const hLower = handlingTypeStr.toLowerCase().trim();

        // 1. Verifica na configuração cadastrada de manuseio no ERP
        if (Array.isArray(handlingOptions) && handlingOptions.length > 0) {
          const matchedOpt = handlingOptions.find((opt: any) =>
            opt.label && opt.label.toLowerCase().trim() === hLower
          );
          if (matchedOpt && typeof matchedOpt.isAssemblyOutside === 'boolean') {
            return matchedOpt.isAssemblyOutside;
          }
        }

        // 2. Fallbacks de segurança: se for montagem no depósito ou por conta do cliente, NÃO é montagem fora
        if (
          hLower.includes('depósito') ||
          hLower.includes('deposito') ||
          hLower.includes('retirada') ||
          hLower.includes('cliente') ||
          hLower.includes('entregue montado')
        ) {
          return false;
        }

        // Se contiver indicação explícita de montagem no local/fora
        return (
          hLower.includes('montagem no local') ||
          hLower.includes('montagem fora') ||
          hLower.includes('montagem na entrega')
        );
      };

      // Função auxiliar para abreviar o nome do produto (máximo 1 a 3 palavras simples, removendo cores e combinações como freijó/off white, preto/branco, cinamomo, etc.)
      const simplifyProductName = (rawName: string): string => {
        if (!rawName) return 'móvel';
        let cleaned = rawName
          .replace(/\(.*?\)/g, '')
          .replace(/\[.*?\]/g, '')
          .replace(/\b[\w\u00C0-\u024F]+(?:\/[\w\u00C0-\u024F]+)+\b/g, '') // remove "preto/branco", "freijo/offwhite"
          .replace(/[-–—]/g, ' ')
          .trim();

        const colorWords = new Set([
          'freijo', 'freijó', 'off', 'white', 'offwhite', 'preto', 'preta',
          'branco', 'branca', 'cinamomo', 'grafite', 'nobre', 'imbuia', 'carvalho',
          'nogueira', 'amêndoa', 'amendoa', 'patina', 'pátina', 'cacau', 'savana',
          'nature', 'jequitiba', 'jequitibá', 'cedro', 'marrom', 'cinza', 'bege',
          'areia', 'champagne', 'champanhe', 'castanho', 'fendi', 'ébano', 'ebano',
          'mel', 'amarelo', 'azul', 'verde', 'rosa', 'vermelho', 'dourado', 'prata'
        ]);

        const words = cleaned.split(/\s+/).filter(Boolean);
        const filteredWords = words.filter(w => !colorWords.has(w.toLowerCase().trim()));

        if (filteredWords.length === 0) return 'móvel';
        return filteredWords.slice(0, 3).join(' ');
      };

      const deliveryOrders = (rawOrders || []).filter((o: any) => {
        const oData = o.order_data || {};
        if (o.deleted || o.is_deleted || o.status === 'deleted' || o.status === 'cancelled' || oData.deleted) return false;

        const shipping = oData.shipping || {};
        const isDelivery = shipping.deliveryMethod === 'delivery' || !shipping.deliveryMethod;
        const schedDate = (shipping.scheduling?.date || o.scheduled_date || o.created_at || '').split('T')[0];

        if (!isDelivery) return false;
        return targetDates.includes(schedDate);
      });

      // Helper para formatar o nome do produto com o artigo gramatical correto (um / uma / dois / duas)
      const formatProductNameWithArticle = (rawName: string, itemQty: number = 1): string => {
        const short = simplifyProductName(rawName).toLowerCase();
        // Usa apenas a PRIMEIRA palavra para determinar o gênero (evita falsos positivos como "balcão para pia")
        const firstWord = short.split(' ')[0];

        const feminineFirstWords = [
          'escrivaninha', 'cômoda', 'comoda', 'pia', 'mesa', 'cadeira',
          'poltrona', 'cozinha', 'cama', 'sapateira', 'cristaleira', 'bancada',
          'prateleira', 'estante', 'estação', 'banheira', 'penteadeira'
        ];
        const isFeminine = feminineFirstWords.some(fw => firstWord === fw || firstWord.startsWith(fw));

        if (itemQty === 1) {
          return `${isFeminine ? 'uma' : 'um'} ${short}`;
        } else if (itemQty === 2) {
          return `${isFeminine ? 'duas' : 'dois'} ${short}s`;
        } else {
          return `${itemQty} ${short}s`;
        }
      };

      // Helper para converter números cardinais por extenso (até 30, outros ficam em dígitos)
      const numWord = (n: number): string => {
        const words: Record<number, string> = {
          0: 'zero', 1: 'uma', 2: 'duas', 3: 'três', 4: 'quatro', 5: 'cinco',
          6: 'seis', 7: 'sete', 8: 'oito', 9: 'nove', 10: 'dez',
          11: 'onze', 12: 'doze', 13: 'treze', 14: 'quatorze', 15: 'quinze',
          16: 'dezesseis', 17: 'dezessete', 18: 'dezoito', 19: 'dezenove', 20: 'vinte',
          21: 'vinte e uma', 22: 'vinte e duas', 23: 'vinte e três', 24: 'vinte e quatro',
          25: 'vinte e cinco', 26: 'vinte e seis', 27: 'vinte e sete', 28: 'vinte e oito',
          29: 'vinte e nove', 30: 'trinta'
        };
        return words[n] ?? String(n);
      };

      // Helper para converter distâncias — usa vírgula real para o TTS ler corretamente
      const formatDistanceConversational = (distNum: number | null): string => {
        if (distNum === null || isNaN(distNum)) return '';
        if (distNum <= 5) return 'pertinho';

        const numStr = distNum.toFixed(1).replace('.', ',');
        if (distNum <= 10) return `não tão perto, a ${numStr} quilômetros`;
        if (distNum <= 20) return `meio longe, a ${numStr} quilômetros`;
        return `bem longe, a ${numStr} quilômetros`;
      };

      // Coleções de entregas por turno
      const morningDeliveries: any[] = [];
      const afternoonDeliveries: any[] = [];
      const unspecifiedDeliveries: any[] = [];

      const citiesMap: Record<string, number> = {};
      let hasFarAssembly = false;
      let hasShowroomDisassembly = false;

      deliveryOrders.forEach((o: any) => {
        const oData = o.order_data || {};
        const shipping = oData.shipping || {};
        const sched = shipping.scheduling || oData.schedule || oData.scheduling || o.schedule || {};

        const deliveryAddr = shipping.deliveryAddress || shipping.address || {};
        const custData = oData.customerData || oData.customer || {};
        const custAddr = custData.address || custData.fullAddress || {};

        const rawCity = (
          deliveryAddr.city ||
          shipping.city ||
          custAddr.city ||
          custData.city ||
          o.city ||
          ''
        ).trim();

        const rawNeighborhood = (
          deliveryAddr.neighborhood ||
          shipping.neighborhood ||
          custAddr.neighborhood ||
          custData.neighborhood ||
          ''
        ).trim();

        const city = rawCity || rawNeighborhood || 'Colombo';
        citiesMap[city] = (citiesMap[city] || 0) + 1;

        const distRaw = shipping.distance ?? shipping.distanceKm ?? o.distance ?? o.distanceKm;
        const distNum = typeof distRaw === 'number' ? distRaw : (parseFloat(distRaw) || null);
        const distText = formatDistanceConversational(distNum);

        const items = oData.items || o.items || [];
        const assemblyItems: string[] = [];
        const noAssemblyItems: string[] = [];

        const orderHandling = (
          oData.handlingType ||
          oData.handling ||
          oData.deliveryType ||
          shipping.handlingType ||
          shipping.handling ||
          o.handling ||
          o.handlingType ||
          ''
        ).toString();
        const isOrderAssemblyOutside = isAssemblyOutsideType(orderHandling);

        items.forEach((item: any) => {
          const rawName = item.description || item.name || item.title || 'móvel';
          const itemQty = item.quantity || item.qty || 1;
          const itemHandling = (item.handlingType || item.handling || '').toString();
          const productWithArticle = formatProductNameWithArticle(rawName, itemQty);

          let isAssembly = false;
          if (itemHandling) {
            isAssembly = isAssemblyOutsideType(itemHandling);
          } else {
            isAssembly = isOrderAssemblyOutside;
          }

          if (!isAssembly && isOrderAssemblyOutside) {
            const hLower = itemHandling.toLowerCase();
            if (!hLower.includes('depósito') && !hLower.includes('deposito') && !hLower.includes('retirada') && !hLower.includes('cliente') && !hLower.includes('entregue montado')) {
              isAssembly = true;
            }
          }

          if (isAssembly) {
            assemblyItems.push(productWithArticle);
          } else {
            noAssemblyItems.push(productWithArticle);
          }
        });

        const timeVal = (sched.startTime || sched.time || '').trim();
        const endTimeVal = (sched.endTime || '').trim();
        const timeValLower = timeVal.toLowerCase();
        const periodVal = (sched.period || sched.shift || sched.turn || '').toLowerCase();
        const combinedVal = `${timeValLower} ${periodVal}`.trim();

        const isStandardWindow = (tStart: string, tEnd: string): boolean => {
          if (!tStart && !tEnd) return true;

          const parseMinutes = (t: string) => {
            const clean = t.replace(/[^\d:]/g, '');
            const parts = clean.split(':');
            if (parts[0]) {
              const h = parseInt(parts[0], 10);
              const m = parts[1] ? parseInt(parts[1], 10) : 0;
              return h * 60 + m;
            }
            return null;
          };

          const sMin = parseMinutes(tStart);
          const eMin = parseMinutes(tEnd);

          // Padrão Manhã: 09:00 (540m) até 12:00 (720m)
          // Padrão Tarde: 13:00 (780m) até 18:00 (1080m)
          if (sMin !== null && eMin !== null) {
            if (sMin >= 540 && sMin <= 570 && eMin >= 720 && eMin <= 750) return true;
            if (sMin >= 780 && sMin <= 810 && eMin >= 1050 && eMin <= 1110) return true;
            return false;
          }

          if (sMin !== null && eMin === null) {
            if (sMin === 540 || sMin === 780) return true;
            return false;
          }

          return true;
        };

        let scheduledTimeStr = '';
        if (!isStandardWindow(timeVal, endTimeVal)) {
          if (timeVal && endTimeVal) {
            scheduledTimeStr = `agendada para um período em específico entre ${timeVal} e ${endTimeVal}`;
          } else if (timeVal) {
            scheduledTimeStr = `agendada para um horário em específico às ${timeVal}`;
          }
        }

        const obsText = (
          (oData.observation || '') + ' ' +
          (o.observation || '') + ' ' +
          (oData.notes || '') + ' ' +
          (oData.notice || '')
        ).toLowerCase();

        const itemHasShowroom = items.some((item: any) => {
          const h = (item.handlingType || item.handling || '').toLowerCase();
          const n = (item.description || item.name || item.title || '').toLowerCase();
          const notes = (item.notes || item.observation || '').toLowerCase();
          return (
            h.includes('mostruário') || h.includes('mostruario') ||
            n.includes('mostruário') || n.includes('mostruario') ||
            notes.includes('mostruário') || notes.includes('mostruario')
          );
        });
        const obsHasShowroom = obsText.includes('mostruário') || obsText.includes('mostruario') || obsText.includes('desmontagem no mostruario') || obsText.includes('desmontagem no mostruário');
        if (itemHasShowroom || obsHasShowroom) {
          hasShowroomDisassembly = true;
        }

        const notices: string[] = [];
        if (obsText.includes('maquina') || obsText.includes('máquina') || obsText.includes('cartao') || obsText.includes('cartão')) {
          notices.push('levar máquina de cartão');
        }
        if (obsText.includes('cooktop') || obsText.includes('recorte')) {
          notices.push('fazer recorte para cooktop');
        }
        if (obsText.includes('forro') || obsText.includes('furo') || obsText.includes('serra copo') || obsText.includes('cerra copo')) {
          notices.push('fazer furo no forro e lembrar de levar serra copo');
        }
        if (obsText.includes('ligar antes') || obsText.includes('avisar antes') || obsText.includes('chamar antes') || obsText.includes('whatsapp antes')) {
          notices.push('ligar antes de ir');
        }
        if (obsText.includes('nota fiscal') || obsText.includes('levar nota') || /\bnf\b/.test(obsText)) {
          notices.push('levar nota fiscal');
        }

        const hasWallMountService = items.some((item: any) => {
          const n = (item.description || item.name || item.title || '').toLowerCase();
          return n.includes('instalação') || n.includes('instalacao') || n.includes('parede') || n.includes('fixação') || n.includes('fixacao');
        });
        if (hasWallMountService || obsText.includes('instalação na parede') || obsText.includes('instalacao na parede') || obsText.includes('fixar na parede')) {
          notices.push('fazer instalação na parede');
        }

        const isMorning =
          combinedVal.includes('manhã') || combinedVal.includes('manha') ||
          combinedVal.includes('morning') ||
          /^(06|07|08|09|10|11):/.test(timeValLower);

        const isAfternoon =
          combinedVal.includes('tarde') || combinedVal.includes('afternoon') ||
          /^(12|13|14|15|16|17|18):/.test(timeValLower);

        const deliveryInfo = {
          city,
          isColombo: city.toLowerCase() === 'colombo',
          distText,
          assemblyItems,
          noAssemblyItems,
          scheduledTimeStr,
          notices
        };

        if (isMorning) morningDeliveries.push(deliveryInfo);
        else if (isAfternoon) afternoonDeliveries.push(deliveryInfo);
        else unspecifiedDeliveries.push(deliveryInfo);
      });

      const totalDeliveries = deliveryOrders.length;
      let smartText = '';

      if (totalDeliveries === 0) {
        smartText = `Não há entregas agendadas ${periodLabel}. Operação e frota disponíveis para novos lançamentos.`;
      } else {
        const morningCount = morningDeliveries.length;
        const afternoonCount = afternoonDeliveries.length;
        const unspecCount = unspecifiedDeliveries.length;

        // Visão geral: conta todos os turnos
        let shiftIntro = '';
        const hasMorning = morningCount > 0;
        const hasAfternoon = afternoonCount > 0;
        const hasUnspec = unspecCount > 0;

        if (hasMorning && hasAfternoon && !hasUnspec) {
          shiftIntro = `, com ${numWord(morningCount)} pela manhã e ${numWord(afternoonCount)} à tarde`;
        } else if (hasMorning && hasAfternoon && hasUnspec) {
          const totalMorning = morningCount + unspecCount;
          shiftIntro = `, com ${numWord(totalMorning)} pela manhã e ${numWord(afternoonCount)} à tarde`;
        } else if (hasMorning && !hasAfternoon) {
          const totalMorning = morningCount + unspecCount;
          shiftIntro = totalMorning === 1 ? `, no período da manhã` : `, todas no período da manhã`;
        } else if (hasAfternoon && !hasMorning && !hasUnspec) {
          shiftIntro = afternoonCount === 1 ? `, no período da tarde` : `, todas no período da tarde`;
        } else if (hasAfternoon && hasUnspec) {
          shiftIntro = `, com ${numWord(unspecCount + morningCount)} pela manhã e ${numWord(afternoonCount)} à tarde`;
        } else if (hasUnspec && !hasMorning && !hasAfternoon) {
          shiftIntro = unspecCount === 1 ? `, sem horário definido` : `, sem horário definido`;
        }

        const deliveriesWord = numWord(totalDeliveries);
        const deliveriesText = totalDeliveries === 1 ? 'uma entrega programada' : `${deliveriesWord} entregas programadas`;
        const overviewSentence = `Para ${periodLabel === 'para hoje' ? 'hoje' : 'amanhã'}, temos ${deliveriesText}${shiftIntro}.`;

        // Helper para formatar uma lista de entregas em texto
        const formatDeliveryParts = (deliveries: any[]) =>
          deliveries.map(d => {
            const citySuffix = d.isColombo ? '' : ` para ${d.city}`;
            const distSuffix = d.distText ? `, ${d.distText}` : '';
            let basePart = '';
            if (d.assemblyItems.length > 0) {
              basePart = `uma entrega${citySuffix} de ${d.assemblyItems.join(' e ')}${distSuffix}, com montagem no endereço`;
            } else if (d.noAssemblyItems.length > 0) {
              basePart = `uma entrega${citySuffix} de ${d.noAssemblyItems.join(' e ')}${distSuffix}, sem montagem no endereço`;
            } else {
              basePart = `uma entrega${citySuffix}${distSuffix}`;
            }

            if (d.scheduledTimeStr) {
              basePart += `, ${d.scheduledTimeStr}`;
            }

            if (d.notices && d.notices.length > 0) {
              basePart += `, com atenção para ${d.notices.join(' e ')}`;
            }

            return basePart;
          });

        // Detalhamento da Manhã
        let morningText = '';
        const morningAll = hasAfternoon
          ? morningDeliveries
          : [...morningDeliveries, ...unspecifiedDeliveries];

        if (morningAll.length > 0) {
          const parts = formatDeliveryParts(morningAll);
          morningText = parts.length === 1
            ? `Pela manhã, temos ${parts[0]}.`
            : `Pela manhã, temos ${parts.slice(0, -1).join(', ')} e ainda ${parts[parts.length - 1]}.`;
        } else if (hasAfternoon) {
          morningText = `Pela manhã não temos entregas.`;
        }

        // Detalhamento da Tarde
        let afternoonText = '';
        if (afternoonDeliveries.length > 0) {
          const parts = formatDeliveryParts(afternoonDeliveries);
          afternoonText = parts.length === 1
            ? `À tarde, temos ${parts[0]}.`
            : `À tarde, temos ${parts.slice(0, -1).join(', ')} e ainda ${parts[parts.length - 1]}.`;
        }

        // Entregas sem turno definido quando há tarde mas não manhã
        let unspecText = '';
        if (hasAfternoon && hasUnspec && !hasMorning) {
          const parts = formatDeliveryParts(unspecifiedDeliveries);
          unspecText = parts.length === 1
            ? ` Também temos ${parts[0]}, sem horário definido.`
            : ` Também temos ${parts.slice(0, -1).join(', ')} e ainda ${parts[parts.length - 1]}, sem horário definido.`;
        }

        // Dica de entrega distante com montagem
        const farAssemblyHint = hasFarAssembly
          ? ` Obs: há entrega distante com montagem no endereço, atenção ao horário de saída.`
          : '';

        // Lembrete de desmontagem no mostruário para entregas de amanhã
        const showroomHint = (mode === 'tomorrow' && hasShowroomDisassembly)
          ? ` Lembrem de desmontar hoje o móvel de mostruário para amanhã estar pronto para ser levado, já que é um móvel de mostruário.`
          : '';

        smartText = `${overviewSentence} ${morningText} ${afternoonText}${unspecText}${farAssemblyHint}${showroomHint}`.trim().replace(/\s+/g, ' ');
      }

      try {
        const geminiPrompt = `Você é o supervisor de logística da Móveis Morante conversando por áudio no WhatsApp com a equipe de entregas. Sua única função é transformar o texto base fornecido em um áudio 100% natural, fluido e conversacional, perfeito para sintetizador de voz (Audio TTS). O texto já está estruturado; só refine a fluência sem alterar os dados.

REGRAS ABSOLUTAS DE CONCORDÂNCIA E PRONÚNCIA:
1. ARTIGOS GRAMATICAIS CORRETOS POR PALAVRA RAIZ DO PRODUTO:
   - "balcão", "guarda-roupa", "armário", "painel", "rack", "sofá", "buffet", "conjunto" → artigo MASCULINO: "um balcão", "um guarda-roupa", "um armário".
   - "escrivaninha", "cômoda", "mesa", "cadeira", "pia", "cama", "sapateira", "cristaleira", "bancada", "prateleira", "estante", "penteadeira" → artigo FEMININO: "uma escrivaninha", "uma mesa", "uma pia".
   - ATENÇÃO: "balcão para pia" começa com "balcão" (masculino) → sempre "um balcão para pia". NUNCA "uma balcão".
2. NÚMEROS E DISTÂNCIAS: Escreva os números cardinais por extenso ("quatro", "três", "uma"). Para distâncias com decimal, USE a vírgula real no formato "5,2 quilômetros", "27,1 quilômetros", NUNCA escreva a palavra "vírgula" por extenso. NUNCA escreva dígitos isolados sem unidade (ex: NUNCA "4 entregas", sempre "quatro entregas").
3. SEM EXPRESSÕES REPETIDAS OU ESTRANHAS: NUNCA comece frases com "E também" ou "Temos uma entrega. Temos uma entrega de...". Funda a informação em uma frase só. JAMAIS escreva nomes em CAIXA ALTA.
4. VISÃO GERAL SEM CIDADE: A primeira frase resume apenas o total e os turnos, SEM mencionar cidades. Exemplo correto: "Para amanhã, temos quatro entregas programadas, com uma pela manhã e três à tarde." — NUNCA: "sendo uma para Curitiba" na visão geral.
5. REGRA ABSOLUTA DE COLOMBO: JAMAIS mencione a palavra "Colombo". Se a entrega for em Colombo, não fale o nome da cidade. Só mencione a cidade quando for fora de Colombo (ex: Curitiba, Pinhais).
6. AVISO DE ENTREGA DISTANTE COM MONTAGEM: Se o texto base contiver uma "Obs:" sobre entrega distante com montagem, transforme em aviso conversacional no final, como: "Pessoal, essa entrega é bem longe e ainda tem montagem no endereço, se programem para sair com tempo."
7. HORÁRIOS E AVISOS OPERACIONAIS: 
   - REGRA DE OURO PARA HORÁRIOS: As janelas padrão de entrega são das 9 às 12 horas (manhã) e das 13 às 18 horas (tarde). Se a entrega for nas janelas padrão (entre 9 e 12h ou entre 13 e 18h), NUNCA diga o horário específico na entrega individual (já está subentendido no turno da manhã ou da tarde). SOMENTE se a entrega for em um horário/período DIFERENTE de 9-12h ou 13-18h (ex: 08:00, 08:00 às 10:00, 18:30), mencione explicitamente que essa entrega foi agendada para um horário ou período em específico.
   - AVISOS OPERACIONAIS: Mantenha sempre avisos operacionais (como levar máquina de cartão, fazer recorte para cooktop, levar serra copo, ligar antes de ir, levar nota fiscal ou fazer instalação na parede).
8. OMISSÃO DE CORES E ACABAMENTOS: PROIBIDO pronunciar nomes de cores ou combinações (ex: NUNCA diga "freijó", "off white", "preto/branco", "preto", "branco", "cinamomo", "grafite", "nobre", "carvalho", etc.). Diga apenas o nome do produto (ex: "uma cômoda grécia" em vez de "uma cômoda grécia freijó", "uma escrivaninha 2 gavetas" em vez de "uma escrivaninha 2 gavetas preto/branco").
9. AVISO DE MOSTRUÁRIO PARA ENTREGAS DE AMANHÃ: Se o texto base de entregas para amanhã incluir instrução sobre móvel de mostruário ("Lembrem de desmontar hoje..."), inclua obrigatoriamente essa lembrança ao final para que a equipe desmonte o móvel no mostruário hoje mesmo para amanhã estar pronto para ser levado.
10. SEM SÍMBOLOS OU MARCAÇÕES: PROIBIDO usar dois-pontos (:), parênteses (()), barras (/), asteriscos (*) ou hashtags (#).
11. RETORNE APENAS O TEXTO A SER PRONUNCIADO: Não inclua cabeçalhos, títulos, explicações nem instruções de locução.

Exemplo do estilo esperado: "Para amanhã, temos quatro entregas programadas, com uma pela manhã e três à tarde. Pela manhã, temos uma entrega pertinho de um balcão para pia e uma pia de marmorite, sem montagem no endereço, agendada para um horário em específico às 08:00. À tarde, temos uma entrega de uma escrivaninha e uma cômoda, não tão perto, a 5,2 quilômetros, sem montagem no endereço, com atenção para levar máquina de cartão, e ainda uma entrega para Curitiba de um guarda-roupa sonata, um balcão e uma cozinha lorena, bem longe, a 26,8 quilômetros, com montagem no endereço, com atenção para fazer instalação na parede. Pessoal, lembrem de desmontar hoje o móvel de mostruário para amanhã estar pronto para ser levado, já que é um móvel de mostruário."

Texto base para refinamento: "${smartText}"`;

        if (geminiKey) {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(geminiKey)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: geminiPrompt }] }] })
          });
          if (res.ok) {
            const resJson = await res.json();
            const aiText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (aiText && aiText.trim()) {
              smartText = aiText.trim()
                .replace(/[*#]/g, '')
                .replace(/:/g, ' ')
                .replace(/[()]/g, '')
                .replace(/\s+/g, ' ');
            }
          }
        }
      } catch (err) {
        console.warn('Fallback local ativado para o resumo da IA:', err);
      }

      try {
        if (mode === 'today') {
          setAiSummaryToday(smartText);
          await AsyncStorage.setItem('@morante_ai_summary_today', smartText).catch(() => {});
          await AsyncStorage.setItem('@morante_ai_summary_fingerprint_today', currentFingerprint).catch(() => {});
        } else if (mode === 'tomorrow') {
          setAiSummaryTomorrow(smartText);
          await AsyncStorage.setItem('@morante_ai_summary_tomorrow', smartText).catch(() => {});
          await AsyncStorage.setItem('@morante_ai_summary_fingerprint_tomorrow', currentFingerprint).catch(() => {});
        }
      } catch (storageErr) {
        console.warn('Cota de armazenamento excedida para AsyncStorage:', storageErr);
      }
    } catch (err) {
      console.warn('Erro ao gerar resumo de entregas com IA:', err);
      const fallbackText = mode === 'today'
        ? 'Não há entregas agendadas para hoje. Operação e frota disponíveis.'
        : 'Não há entregas agendadas para amanhã. Operação e frota disponíveis.';
      if (mode === 'today') setAiSummaryToday(fallbackText);
      else if (mode === 'tomorrow') setAiSummaryTomorrow(fallbackText);
    } finally {
      setIsGeneratingAISummary(false);
    }
  };

  useEffect(() => {
    const initCachedSummaries = async () => {
      try {
        const [cachedToday, cachedTomorrow] = await Promise.all([
          AsyncStorage.getItem('@morante_ai_summary_today'),
          AsyncStorage.getItem('@morante_ai_summary_tomorrow')
        ]);
        if (cachedToday) setAiSummaryToday(cachedToday);
        if (cachedTomorrow) setAiSummaryTomorrow(cachedTomorrow);
      } catch (e) {}

      // Verifica se houve novos pedidos/alterações para atualizar apenas se necessário
      generateDeliveryAISummary('today', false);
      generateDeliveryAISummary('tomorrow', false);
    };

    initCachedSummaries();
  }, []);

  // Estados para o Player de Áudio do Resumo Inteligente (Gemini TTS API + Draggable Slider)
  const [speechCurrentTime, setSpeechCurrentTime] = useState<number>(0);
  const [speechTotalDuration, setSpeechTotalDuration] = useState<number>(0);
  const [speechIsPaused, setSpeechIsPaused] = useState<boolean>(false);
  const [isLoadingGeminiAudio, setIsLoadingGeminiAudio] = useState<boolean>(false);
  const speechIntervalRef = useRef<any>(null);
  const speechTextRef = useRef<string>('');
  const geminiSoundRef = useRef<Audio.Sound | null>(null);
  const timelineBarWidthRef = useRef<number>(280);

  const formatAudioTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startSpeechTimer = (totalSecs: number, initialOffset: number = 0) => {
    if (speechIntervalRef.current) clearInterval(speechIntervalRef.current);

    let current = initialOffset;
    setSpeechCurrentTime(current);
    setSpeechTotalDuration(totalSecs);

    speechIntervalRef.current = setInterval(() => {
      current += 0.25;
      if (current >= totalSecs) {
        clearInterval(speechIntervalRef.current);
        setSpeechCurrentTime(totalSecs);
      } else {
        setSpeechCurrentTime(current);
      }
    }, 250);
  };

  const stopSpeechTimer = () => {
    if (speechIntervalRef.current) {
      clearInterval(speechIntervalRef.current);
      speechIntervalRef.current = null;
    }
    setSpeechCurrentTime(0);
  };

  // Gerador de Áudio via Gemini API TTS (gemini-2.5-flash-preview-tts)
  const fetchGeminiTTSAudio = async (textToSpeak: string): Promise<string | null> => {
    try {
      const { data: settingsData } = await supabase.from('settings').select('*').eq('id', 'app').single();
      const geminiKey = settingsData?.geminiApiKey || process.env.VITE_GEMINI_API_KEY || '';
      if (!geminiKey) return null;

      // Chamada à API Gemini usando o modelo especificamente solicitado gemini-2.5-flash-preview-tts
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${encodeURIComponent(geminiKey)}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: textToSpeak }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: "Puck" }
              }
            }
          }
        })
      });

      if (res.ok) {
        const resJson = await res.json();
        const inlineData = resJson?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        if (inlineData && inlineData.data) {
          const mimeType = inlineData.mimeType || 'audio/mp3';
          return `data:${mimeType};base64,${inlineData.data}`;
        }
      }
    } catch (err) {
      console.warn('Fallback ativado para voz sintética nativa:', err);
    }
    return null;
  };

  const seekAudioToRatio = async (ratio: number) => {
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    const targetSecs = clampedRatio * (speechTotalDuration || 15);
    setSpeechCurrentTime(targetSecs);

    if (geminiSoundRef.current) {
      try {
        await geminiSoundRef.current.setPositionAsync(targetSecs * 1000);
      } catch (_) {}
    } else {
      const currentText = aiSummaryTab === 'today' ? aiSummaryToday : aiSummaryTomorrow;
      if (currentText) {
        playSpeechFromOffset(currentText, targetSecs);
      }
    }
  };

  const playSpeechFromOffset = async (fullText: string, offsetSecs: number) => {
    if (geminiSoundRef.current) {
      try { await geminiSoundRef.current.unloadAsync(); } catch (_) {}
      geminiSoundRef.current = null;
    }
    try { await Speech.stop(); } catch (_) {}
    stopSpeechTimer();

    setIsLoadingGeminiAudio(true);

    try {
      // 1. Tenta obter o áudio real gerado pela IA Gemini (gemini-2.5-flash-preview-tts)
      const geminiAudioUri = await fetchGeminiTTSAudio(fullText);
      setIsLoadingGeminiAudio(false);

      if (geminiAudioUri) {
        const { sound } = await Audio.Sound.createAsync(
          { uri: geminiAudioUri },
          { shouldPlay: true, positionMillis: offsetSecs * 1000 }
        );
        geminiSoundRef.current = sound;
        setIsSpeakingSummary(true);
        setSpeechIsPaused(false);

        sound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.isLoaded) {
            if (status.durationMillis) {
              setSpeechTotalDuration(status.durationMillis / 1000);
            }
            if (status.positionMillis !== undefined) {
              setSpeechCurrentTime(status.positionMillis / 1000);
            }
            if (status.didJustFinish) {
              setIsSpeakingSummary(false);
              setSpeechIsPaused(false);
              setSpeechCurrentTime(0);
            }
          }
        });
        return;
      }
    } catch (e) {
      console.warn('Usando voz sintética nativa de alta qualidade como fallback:', e);
    } finally {
      setIsLoadingGeminiAudio(false);
    }

    // 2. Fallback para voz sintética nativa com sincronização de tempo
    const charPerSec = 14;
    const charOffset = Math.floor(offsetSecs * charPerSec);
    const remainingText = fullText.slice(charOffset) || fullText;
    const totalSecs = Math.max(5, Math.ceil(fullText.length / charPerSec));

    setSpeechIsPaused(false);
    setIsSpeakingSummary(true);
    speechTextRef.current = fullText;

    startSpeechTimer(totalSecs, offsetSecs);

    try {
      const voices = await Speech.getAvailableVoicesAsync();
      const ptVoices = voices.filter(v => v.language && (v.language.includes('pt') || v.language.includes('PT')));

      const naturalVoice = ptVoices.find(v => {
        const id = (v.identifier || '').toLowerCase();
        const name = (v.name || '').toLowerCase();
        const qual = String(v.quality || '').toLowerCase();

        return (
          qual.includes('enhanced') || qual.includes('premium') ||
          id.includes('natural') || id.includes('wavenet') || id.includes('enhanced') || id.includes('premium') || id.includes('google') || id.includes('network') || id.includes('pt-br-x-') ||
          name.includes('natural') || name.includes('enhanced') || name.includes('google') || name.includes('luciana') || name.includes('felipe')
        );
      }) || ptVoices[0];

      const options: Speech.SpeechOptions = {
        language: 'pt-BR',
        rate: 0.95,
        pitch: 1.0,
        onDone: () => {
          setIsSpeakingSummary(false);
          setSpeechIsPaused(false);
          stopSpeechTimer();
        },
        onStopped: () => {
          setIsSpeakingSummary(false);
          setSpeechIsPaused(false);
          stopSpeechTimer();
        },
        onError: () => {
          setIsSpeakingSummary(false);
          setSpeechIsPaused(false);
          stopSpeechTimer();
        }
      };

      if (naturalVoice && naturalVoice.identifier) {
        options.voice = naturalVoice.identifier;
      }

      Speech.speak(remainingText, options);
    } catch (err) {
      console.warn('Erro ao falar áudio:', err);
    }
  };

  const handleToggleSpeech = async (text: string) => {
    if (!text) return;

    if (geminiSoundRef.current) {
      if (isSpeakingSummary) {
        if (!speechIsPaused) {
          await geminiSoundRef.current.pauseAsync();
          setSpeechIsPaused(true);
        } else {
          await geminiSoundRef.current.playAsync();
          setSpeechIsPaused(false);
        }
      } else {
        await playSpeechFromOffset(text, 0);
      }
      return;
    }

    if (isSpeakingSummary) {
      if (!speechIsPaused) {
        try { await Speech.pause(); } catch (_) { await Speech.stop(); }
        if (speechIntervalRef.current) clearInterval(speechIntervalRef.current);
        setSpeechIsPaused(true);
      } else {
        try { await Speech.resume(); } catch (_) { await playSpeechFromOffset(text, speechCurrentTime); return; }
        setSpeechIsPaused(false);
        startSpeechTimer(speechTotalDuration, speechCurrentTime);
      }
    } else {
      await playSpeechFromOffset(text, 0);
    }
  };

  const handleSeekOffset = (offsetSecs: number) => {
    const text = aiSummaryTab === 'today' ? aiSummaryToday : aiSummaryTomorrow;
    if (!text) return;

    const newTime = Math.max(0, Math.min(speechTotalDuration || 15, speechCurrentTime + offsetSecs));
    seekAudioToRatio(newTime / (speechTotalDuration || 15));
  };

  // Estados do formulário de Login Nativo
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Formata data do dia em PT-BR
  const getTodayFormattedDate = () => {
    const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const now = new Date();
    return `${days[now.getDay()]}, ${now.getDate()} de ${months[now.getMonth()]}`;
  };

  // Tocar som de notificação diferenciado
  const playNotificationSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: NOTIFICATION_SOUND_URL },
        { shouldPlay: true }
      );
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
        }
      });
    } catch (error) {
      console.warn('Erro ao reproduzir áudio de notificação:', error);
    }
  };

  // Ouvir novos pedidos criados em tempo real (Supabase Postgres Changes)
  useEffect(() => {
    const channel = supabase
      .channel('realtime-global-new-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, async (payload) => {
        const newOrder = payload.new;
        if (!newOrder) return;

        const orderData = newOrder.order_data || {};
        const customerName = orderData.customerData?.fullName || newOrder.customer_name || 'Cliente';
        const total = getOrderTotalValue(newOrder);
        const formattedTotal = Number(total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        // Toca o som de notificação e aciona a vibração física no dispositivo
        playNotificationSound();
        Vibration.vibrate([0, 250, 250, 250]);

        const newNotif = {
          id: `${newOrder.id}-${Date.now()}`,
          title: `🛒 Novo Pedido #${newOrder.id?.slice(-6).toUpperCase()}`,
          message: `Cliente: ${customerName} • Total: ${formattedTotal}`,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          scheduleText: formatOrderSchedulingText(orderData.shipping || {}, newOrder),
          order: newOrder
        };

        setNotifications(prev => [newNotif, ...prev]);
        setUnreadCount(prev => prev + 1);

        // Atualiza estatísticas do dashboard e o Resumo Inteligente de Entregas da IA Gemini
        fetchDashboardStats();
        generateDeliveryAISummary('today');
        generateDeliveryAISummary('next5days');
        Alert.alert(
          `🛒 NOVO PEDIDO RECEBIDO!`,
          `Pedido #${newOrder.id?.slice(-6).toUpperCase()} de ${customerName} (${formattedTotal})`,
          [
            { text: 'Fechar', style: 'cancel' },
            {
              text: 'Ver Pedido',
              onPress: () => setAppSelectedOrder(newOrder)
            }
          ]
        );
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  // Calcula intervalo de datas segundo o período selecionado
  const getPeriodDateRange = (periodId: string) => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localNow = new Date(now.getTime() - (offset * 60 * 1000));
    const todayStr = localNow.toISOString().split('T')[0];

    let startDateStr = todayStr;
    let endDateStr = todayStr;

    if (periodId === 'this_week') {
      const dayOfWeek = localNow.getDay(); // 0 = Domingo, 1 = Segunda...
      const start = new Date(localNow.getTime() - (dayOfWeek * 24 * 60 * 60 * 1000));
      startDateStr = start.toISOString().split('T')[0];
    } else if (periodId === 'this_month') {
      const start = new Date(localNow.getFullYear(), localNow.getMonth(), 1);
      startDateStr = start.toISOString().split('T')[0];
    } else if (periodId === 'last_30_days') {
      const start = new Date(localNow.getTime() - (30 * 24 * 60 * 60 * 1000));
      startDateStr = start.toISOString().split('T')[0];
    } else if (periodId === 'this_quarter') {
      const currentMonth = localNow.getMonth();
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
      const start = new Date(localNow.getFullYear(), quarterStartMonth, 1);
      startDateStr = start.toISOString().split('T')[0];
    } else if (periodId === 'this_year') {
      const start = new Date(localNow.getFullYear(), 0, 1);
      startDateStr = start.toISOString().split('T')[0];
    } else if (periodId === 'last_year') {
      const start = new Date(localNow.getTime() - (365 * 24 * 60 * 60 * 1000));
      startDateStr = start.toISOString().split('T')[0];
    }

    return { startDateStr, endDateStr };
  };

  const isDateInRange = (dateStr: string, startDateStr: string, endDateStr: string) => {
    if (!dateStr) return false;
    const cleanDate = dateStr.split('T')[0];
    return cleanDate >= startDateStr && cleanDate <= endDateStr;
  };

  // Formata o texto de agendamento do pedido com suporte a intervalos de data e horário
  const formatOrderSchedulingText = (shipping: any, order: any): string => {
    const sched = shipping?.scheduling || {};

    if (sched.pendingScheduling) {
      return 'Agendamento: Pendente';
    }

    const formatDateStr = (dStr: string) => {
      if (!dStr) return '';
      const clean = dStr.split('T')[0];
      const parts = clean.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return clean;
    };

    const startDate = sched.date || order?.scheduled_date || order?.order_data?.scheduledDate;
    const endDate = sched.endDate;

    let dateLabel = '';
    if (sched.dateType === 'range' && endDate && startDate) {
      dateLabel = `${formatDateStr(startDate)} até ${formatDateStr(endDate)}`;
    } else if (startDate) {
      dateLabel = formatDateStr(startDate);
    }

    let timeLabel = '';
    if (sched.type === 'range' && sched.startTime && sched.endTime) {
      timeLabel = `${sched.startTime} até ${sched.endTime}`;
    } else if (sched.startTime) {
      timeLabel = sched.startTime;
    } else if (sched.time) {
      timeLabel = sched.time;
    }

    if (dateLabel && timeLabel) {
      return `Agendamento: ${dateLabel} · ${timeLabel}`;
    } else if (dateLabel) {
      return `Agendamento: ${dateLabel}`;
    } else if (timeLabel) {
      return `Agendamento: ${timeLabel}`;
    }

    return 'Agendamento: Não informado';
  };

  // Buscar entregas, montagens no depósito (amarelo), montagens fora (vermelho), assistências e devoluções pelo período selecionado
  const fetchDashboardStats = async (periodId: string = selectedPeriod) => {
    setLoadingStats(true);
    try {
      const { startDateStr, endDateStr } = getPeriodDateRange(periodId);

      const { data: orders, error: ordersErr } = await supabase
        .from('orders')
        .select('id, status, created_at, order_data');

      if (ordersErr) throw ordersErr;

      let deliveryCnt = 0;
      let assemblyInternalCnt = 0;
      let assemblyOutsideCnt = 0;
      let assistanceCnt = 0;
      let returnCnt = 0;

      // Busca configurações do ERP para diferenciar manuseio
      const { data: settingsData } = await supabase.from('settings').select('*').eq('id', 'app').single();
      const deliveryOpts = settingsData?.deliveryHandlingOptions || [];
      const pickupOpts = settingsData?.pickupHandlingOptions || [];
      const allOpts = [...deliveryOpts, ...pickupOpts];

      const normalize = (str: string) => (str || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      if (orders) {
        orders.forEach((o: any) => {
          const orderData = o.order_data || {};
          const shipping = orderData.shipping || {};
          const items = orderData.items || o.items || [];
          const schedDate = shipping.scheduling?.date || orderData.scheduledDate || o.created_at;

          if (isDateInRange(schedDate, startDateStr, endDateStr)) {
            // 1. Entregas
            if (o.status !== 'cancelled' && shipping.deliveryMethod === 'delivery') {
              deliveryCnt++;
            }

            // 2. Montagens no Depósito (Martelo Amarelo) e Montagens Fora (Martelo Vermelho)
            // Conta por PRODUTO (qty), não por pedido
            if (o.status !== 'cancelled') {
              items.forEach((i: any) => {
                const hLabel = normalize(i.handlingType || i.handling_type || i.handling || '');
                if (!hLabel) return;
                const itemQty = Number(i.qty || i.quantity || 1);

                const opt = allOpts.find((oObj: any) => typeof oObj === 'object' && normalize(oObj.label) === hLabel);
                if (opt) {
                  if (opt.isAssemblyOutside) assemblyOutsideCnt += itemQty;
                  else if (opt.includeInAssemblySchedule) assemblyInternalCnt += itemQty;
                } else if (hLabel.includes('montagem no deposito') || hLabel.includes('montagem para retirada')) {
                  assemblyInternalCnt += itemQty;
                } else if (hLabel.includes('montagem na entrega') || hLabel.includes('montagem fora')) {
                  assemblyOutsideCnt += itemQty;
                }
              });
            }

            // 3. Assistências
            const isAssistance = orderData.orderType === 'assistance' || 
              o.status === 'assistance' || 
              items.some((i: any) => i.handlingType && i.handlingType.toLowerCase().includes('assist'));
            if (isAssistance) {
              assistanceCnt++;
            }

            // 4. Devoluções
            const isReturn = o.status === 'returned' || 
              orderData.status === 'returned' || 
              orderData.orderType === 'return' || 
              !!orderData.returnOrderId;
            if (isReturn) {
              returnCnt++;
            }
          }
        });
      }

      // Adiciona montagens de mostruário no período como Montagem no Depósito (Martelo Amarelo)
      const { data: showcaseData } = await supabase
        .from('showcase_assemblies')
        .select('*');

      // Adiciona montagens de mosruário no período como Montagem no Depósito (Martelo Amarelo)
      // Cada montagem de mosruário conta como 1 produto
      if (showcaseData) {
        showcaseData.forEach((s: any) => {
          if (s.status !== 'completed' && isDateInRange(s.date, startDateStr, endDateStr)) {
            assemblyInternalCnt += 1;
          }
        });
      }

      setDeliveriesCount(deliveryCnt);
      setAssembliesInternalCount(assemblyInternalCnt);
      setAssembliesOutsideCount(assemblyOutsideCnt);
      setAssistancesCount(assistanceCnt);
      setReturnsCount(returnCnt);

      // Carrega os pedidos feitos/gerados HOJE (baseado estritamente em created_at)
      const nowStr = new Date().toISOString().split('T')[0];
      const todayOrders = (orders || []).filter((o: any) => {
        const cDate = (o.created_at || '').split('T')[0];
        return cDate === nowStr && !o.deleted;
      });

      const todayNotifications = todayOrders.map((o: any) => {
        const oData = o.order_data || {};
        const customerName = oData.customerData?.fullName || o.customer_name || 'Cliente';
        const total = getOrderTotalValue(o);
        const formattedTotal = Number(total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const timeStr = o.created_at ? new Date(o.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Hoje';

        const shipping = oData.shipping || {};
        const scheduleText = formatOrderSchedulingText(shipping, o);

        return {
          id: o.id,
          title: `🛒 Novo Pedido #${o.id?.slice(-6).toUpperCase()}`,
          message: `Cliente: ${customerName} • Total: ${formattedTotal}`,
          timestamp: timeStr,
          scheduleText,
          order: o
        };
      });

      setNotifications(todayNotifications);
    } catch (error) {
      console.warn('Erro ao atualizar estatísticas do Dashboard:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handlePeriodChange = (periodId: string) => {
    setSelectedPeriod(periodId);
    fetchDashboardStats(periodId);
  };

  const [rawSession, setRawSession] = useState<any>(null);

  // Script injetado no WebView para sincronizar a sessão de autenticação do Administrador Master
  const injectedSessionJS = React.useMemo(() => {
    const sessionObj = rawSession || {
      access_token: 'mobile-master-session-token',
      refresh_token: 'mobile-master-refresh-token',
      expires_in: 604800,
      expires_at: Math.floor(Date.now() / 1000) + 604800,
      token_type: 'bearer',
      user: {
        id: userProfile?.id || '13eab361-be48-4e49-be4b-4ad79813b812',
        email: userProfile?.email || 'matheusmorante002@gmail.com',
        role: 'authenticated',
        aud: 'authenticated',
        user_metadata: { full_name: userProfile?.fullName || 'Matheus Morante' }
      }
    };

    return `
      (function() {
        try {
          var sessionKey = 'sb-hkoxhourxwlddgsfdgws-auth-token';
          var sessionValue = ${JSON.stringify(JSON.stringify(sessionObj))};
          window.localStorage.setItem(sessionKey, sessionValue);
        } catch(e) {}
        true;
      })();
    `;
  }, [rawSession, userProfile]);

  // Trata recebimento do perfil de usuário e persiste por 7 dias
  const handleProfileReceived = async (profile: any, sessionObj?: any) => {
    if (profile) {
      setUserProfile(profile);
      if (sessionObj) {
        setRawSession(sessionObj);
      }
      if (currentTab === 'login') {
        setCurrentTab('home');
      }
      try {
        await AsyncStorage.setItem('@morante_user_session', JSON.stringify({
          profile,
          rawSession: sessionObj || rawSession,
          loginTimestamp: Date.now()
        }));
      } catch (e) {
        console.warn('Erro ao salvar sessão no armazenamento local:', e);
      }
    }
  };

  // Função de Login Nativo Mobile via Supabase
  const handleNativeLogin = async () => {
    if (!loginEmail.trim() || !loginPassword) {
      setLoginError('Por favor, preencha o e-mail e a senha.');
      return;
    }

    setIsLoggingIn(true);
    setLoginError('');

    try {
      const emailClean = loginEmail.trim().toLowerCase();
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emailClean,
        password: loginPassword,
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          throw new Error('E-mail ou senha incorretos. Verifique suas credenciais.');
        }
        throw authError;
      }

      if (authData?.user) {
        const user = authData.user;
        const isMaster = emailClean.includes('matheus') && emailClean.includes('morante');

        let { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        const profileData = {
          id: user.id,
          email: user.email,
          role: isMaster ? 'administrator' : (profile?.role || 'seller'),
          fullName: profile?.full_name || user.user_metadata?.full_name || (isMaster ? 'Matheus Morante' : user.email?.split('@')[0])
        };

        await handleProfileReceived(profileData, authData.session);
      }
    } catch (err: any) {
      setLoginError(err.message || 'Falha ao realizar login. Verifique suas credenciais.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const fetchUserProfileAndSetSession = async (user: any, sessionObj?: any) => {
    const userEmail = (user.email || '').toLowerCase().trim();
    const isMaster = userEmail.includes('matheus') && userEmail.includes('morante');

    let { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    const profileData = {
      id: user.id,
      email: user.email,
      role: isMaster ? 'administrator' : (profile?.role || 'seller'),
      fullName: profile?.full_name || user.user_metadata?.full_name || (isMaster ? 'Matheus Morante' : user.email?.split('@')[0])
    };

    const activeSession = sessionObj || (await supabase.auth.getSession()).data?.session;
    await handleProfileReceived(profileData, activeSession);
  };

  // Autenticação Nativa com Google via Navegador do Sistema com Deep Linking (morantehub://)
  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const redirectUrl = Linking.createURL('/');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: Platform.OS !== 'web',
        },
      });

      if (error) throw error;

      if (Platform.OS !== 'web' && data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (result.type === 'success' && result.url) {
          try {
            // Extrai tokens de acesso se retornados no hash da URL
            const urlObj = new URL(result.url);
            const hashParams = new URLSearchParams(urlObj.hash.substring(1));
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');

            if (accessToken && refreshToken) {
              const { data: sessionData } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
              });
              if (sessionData?.user) {
                await fetchUserProfileAndSetSession(sessionData.user, sessionData.session);
                return;
              }
            }
          } catch (e) {
            // Fallback para getSession
          }

          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.user) {
            await fetchUserProfileAndSetSession(sessionData.session.user, sessionData.session);
          }
        }
      }
    } catch (err: any) {
      setLoginError(err.message || 'Falha ao autenticar com Google. Tente novamente.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Processa tokens de autenticação recebidos via hash de URL (ex: #access_token=...&refresh_token=...)
  const checkUrlSession = async () => {
    try {
      let hash = '';
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hash) {
        hash = window.location.hash.substring(1);
      } else if (Platform.OS !== 'web') {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl && initialUrl.includes('#')) {
          hash = initialUrl.substring(initialUrl.indexOf('#') + 1);
        }
      }

      if (hash) {
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          const { data: sessionData } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (sessionData?.user) {
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
              window.history.replaceState(null, '', window.location.pathname);
            }
            await fetchUserProfileAndSetSession(sessionData.user, sessionData.session);
            return true;
          }
        }
      }
    } catch (e) {
      console.warn('Erro ao processar URL de autenticação:', e);
    }
    return false;
  };

  // Carregar sessão salva do armazenamento local ou URL ao iniciar
  useEffect(() => {
    const loadSavedSession = async () => {
      const hasUrlSession = await checkUrlSession();
      if (hasUrlSession) return;

      try {
        const stored = await AsyncStorage.getItem('@morante_user_session');
        if (stored) {
          const { profile, rawSession: savedRawSession, loginTimestamp } = JSON.parse(stored);
          if (profile && loginTimestamp && (Date.now() - loginTimestamp < SEVEN_DAYS_MS)) {
            setUserProfile(profile);
            if (savedRawSession) setRawSession(savedRawSession);
            setCurrentTab('home');
          } else {
            // Reativa a sessão Master por padrão
            setUserProfile(MASTER_DEFAULT_PROFILE);
            setRawSession(null);
            setCurrentTab('home');
          }
        } else {
          setUserProfile(MASTER_DEFAULT_PROFILE);
          setCurrentTab('home');
        }
      } catch (err) {
        console.warn('Erro ao verificar sessão salva:', err);
      }
    };
    loadSavedSession();
  }, []);

  useEffect(() => {
    fetchDashboardStats();

    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      playThroughEarpieceAndroid: false
    }).catch(() => {});

    if (Platform.OS === 'web') {
      const handleWindowMessage = (event: MessageEvent) => {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (data && data.type === 'USER_PROFILE') {
            handleProfileReceived(data.profile);
          }
        } catch (e) {
          // Ignores non-JSON messages
        }
      };
      window.addEventListener('message', handleWindowMessage);
    }

    const ordersChannel = supabase
      .channel('orders-new-realtime')
      .on('postgres_changes' as any, { event: 'INSERT', table: 'orders' }, (payload: any) => {
        const newOrder = payload.new;
        if (newOrder) {
          const clientName = newOrder.customerData?.fullName || "Cliente não informado";
          const orderVal = newOrder.totalValue ? `R$ ${Number(newOrder.totalValue).toFixed(2)}` : "Valor não informado";
          
          const notif = {
            id: newOrder.id,
            title: "Novo Pedido Recebido! 🛍️",
            message: `Pedido #${newOrder.id?.slice(-8).toUpperCase()} · ${orderVal}\nCliente: ${clientName}`,
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          };

          playNotificationSound();
          Vibration.vibrate([0, 150, 100, 150]);

          setNotifications(prev => [notif, ...prev]);
          setUnreadCount(c => c + 1);
          fetchDashboardStats();
        }
      })
      .subscribe();

    return () => {
      ordersChannel.unsubscribe();
    };
  }, [currentTab]);

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'USER_PROFILE') {
        handleProfileReceived(data.profile);
      }
    } catch (e) {
      console.warn("Erro ao processar mensagem do WebView:", e);
    }
  };

  const getUrlWithAuthParams = (baseUrl: string) => {
    const email = userProfile?.email || 'matheusmorante002@gmail.com';
    const userId = userProfile?.id || '13eab361-be48-4e49-be4b-4ad79813b812';
    const role = userProfile?.role || 'administrator';

    const sep = baseUrl.includes('?') ? '&' : '?';
    let full = `${baseUrl}${sep}auth_email=${encodeURIComponent(email)}&user_id=${encodeURIComponent(userId)}&auth_role=${encodeURIComponent(role)}&is_mobile_app=true`;

    const token = rawSession?.access_token || 'mobile-master-session-token';
    const rToken = rawSession?.refresh_token || 'mobile-master-refresh-token';

    if (!full.includes('#')) {
      full += `#access_token=${token}&refresh_token=${rToken}&type=bearer`;
    }

    return full;
  };

  const handleTabChange = (tab: string, targetUrl: string) => {
    setCurrentTab(tab);
    if (tab === 'home') {
      fetchDashboardStats(selectedPeriod);
    } else {
      const fullUrl = getUrlWithAuthParams(targetUrl);
      setWebViewUrl(fullUrl);
    }
  };

  const handleLogout = async () => {
    setUserProfile(null);
    setCurrentTab('login');
    setWebViewUrl(`${WEB_URL}/login`);
    try {
      await AsyncStorage.removeItem('@morante_user_session');
    } catch (e) {
      console.warn('Erro ao remover sessão:', e);
    }
  };

  const canSeeReports = userProfile?.role === 'administrator' || userProfile?.role === 'manager';

  // Se estiver na tela de login ou não tiver perfil autenticado, exibe login 100% Nativo Mobile
  if (currentTab === 'login' || !userProfile) {
    return (
      <SafeAreaView style={styles.loginContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <ScrollView contentContainerStyle={styles.loginScrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.loginCard}>
            {/* Header / Brand */}
            <View style={styles.loginHeader}>
              <View style={styles.loginLogoWrapper}>
                <Text style={styles.loginLogoText}>E</Text>
              </View>
              <Text style={styles.loginTitle}>ERP Móveis Morante</Text>
              <Text style={styles.loginSubtitle}>GESTÃO DE MÓVEIS E SERVIÇOS</Text>
            </View>

            {/* Banner de Erro */}
            {!!loginError && (
              <View style={styles.loginErrorBox}>
                <AlertTriangle size={16} color="#ef4444" style={{ marginRight: 8 }} />
                <Text style={styles.loginErrorText}>{loginError}</Text>
              </View>
            )}

            {/* Campo E-mail */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>E-MAIL</Text>
              <View style={styles.inputWrapper}>
                <Mail size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="exemplo@email.com"
                  placeholderTextColor="#94a3b8"
                  value={loginEmail}
                  onChangeText={setLoginEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Campo Senha */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>SENHA</Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="••••••••"
                  placeholderTextColor="#94a3b8"
                  value={loginPassword}
                  onChangeText={setLoginPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  {showPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
                </TouchableOpacity>
              </View>
            </View>

            {/* Botão Entrar no Sistema */}
            <TouchableOpacity
              style={[styles.loginButton, isLoggingIn && styles.loginButtonDisabled]}
              onPress={handleNativeLogin}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <View style={styles.loginButtonContent}>
                  <Text style={styles.loginButtonText}>ENTRAR NO SISTEMA</Text>
                  <ArrowRight size={18} color="#ffffff" style={{ marginLeft: 8 }} />
                </View>
              )}
            </TouchableOpacity>

            {/* Separador */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OU CONTINUAR COM</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Botão Entrar com Google Nativo */}
            <TouchableOpacity
              style={[styles.googleButton, isLoggingIn && styles.loginButtonDisabled]}
              onPress={handleGoogleLogin}
              disabled={isLoggingIn}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24" style={{ marginRight: 10 }}>
                <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </Svg>
              <Text style={styles.googleButtonText}>ENTRAR COM GOOGLE</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.loginFooterText}>SISTEMA DE ALTA PERFORMANCE · V2.1</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDarkMode && { backgroundColor: '#0f172a' }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={isDarkMode ? '#0f172a' : '#ffffff'} />
      
      {/* Header Nativo Premium */}
      <View style={[styles.header, isDarkMode && styles.headerDark]}>
        <View>
          <Text style={[styles.headerSubtitle, isDarkMode && styles.textMutedDark]}>ERP MORANTEHUB</Text>
          <Text style={[styles.headerTitle, isDarkMode && styles.textPrimaryDark]}>
            {currentTab === 'home' 
              ? 'Dashboard' 
              : currentTab === 'pedidos' 
              ? 'Pedidos' 
              : (currentTab === 'logistica' || currentTab === 'entregas') 
              ? 'Cronograma' 
              : currentTab === 'montagens' 
              ? 'Montagens' 
              : 'Relatórios'}
          </Text>
        </View>
        
        <View style={styles.headerActions}>
          {/* Botão de Modo Noturno */}
          <TouchableOpacity 
            style={[styles.iconButton, isDarkMode && styles.iconButtonDark]}
            onPress={() => setIsDarkMode(!isDarkMode)}
            activeOpacity={0.7}
          >
            {isDarkMode ? (
              <Sun size={20} color="#f59e0b" />
            ) : (
              <Moon size={20} color="#475569" />
            )}
          </TouchableOpacity>

          {/* Botão de Notificações com Badge */}
          <TouchableOpacity 
            style={[styles.iconButton, isDarkMode && styles.iconButtonDark]}
            onPress={() => {
              setUnreadCount(0);
              setShowNotificationsModal(true);
            }}
          >
            <Bell size={20} color={isDarkMode ? '#cbd5e1' : '#1e293b'} />
            {unreadCount > 0 && (
              <View style={styles.redBadge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Botão de Perfil */}
          <TouchableOpacity
            style={styles.profileAvatarButton}
            onPress={() => setShowProfileModal(true)}
            activeOpacity={0.8}
          >
            <User size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {currentTab === 'home' ? (
          <ScrollView style={styles.scrollContainer} contentContainerStyle={{ paddingBottom: 30 }}>
            {/* Header de Boas-Vindas */}
            <View style={styles.dateHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dateText}>{getTodayFormattedDate()}</Text>
                <Text style={styles.welcomeText}>
                  Olá, {userProfile?.fullName || 'Colaborador Morante'}!
                </Text>
              </View>
            </View>

            {/* Card de Resumo Inteligente de Entregas via IA Gemini */}
            <View style={{
              backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
              borderRadius: 24,
              padding: 18,
              marginTop: 12,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: isDarkMode ? '#334155' : '#e2e8f0',
              shadowColor: '#2563eb',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.06,
              shadowRadius: 10,
              elevation: 2,
              gap: 12
            }}>
              {/* Header do Card com Ícones de IA */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ backgroundColor: isDarkMode ? '#1e3a8a' : '#eff6ff', padding: 8, borderRadius: 12 }}>
                    <Sparkles size={18} color="#2563eb" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '900', color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
                      Resumo Inteligente de Entregas
                    </Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b' }}>
                      Inteligência Logística Morante · IA Gemini
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {isGeneratingAISummary && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: isDarkMode ? '#1e3a8a' : '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                      <ActivityIndicator size="small" color="#2563eb" />
                      <Text style={{ fontSize: 9, fontWeight: '800', color: '#2563eb' }}>Gerando...</Text>
                    </View>
                  )}

                  {/* Botão de Recarregar/Atualizar Resumo Inteligente (Restrito a Administradores) */}
                  {(!userProfile?.role || userProfile?.role === 'administrator' || userProfile?.role === 'admin' || userProfile?.role === 'administrador') && (
                    <TouchableOpacity
                      onPress={() => generateDeliveryAISummary(aiSummaryTab, true)}
                      disabled={isGeneratingAISummary}
                      activeOpacity={0.7}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: isDarkMode ? '#334155' : '#eff6ff',
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: isDarkMode ? '#475569' : '#bfdbfe'
                      }}
                    >
                      <RefreshCw size={13} color="#2563eb" style={{ opacity: isGeneratingAISummary ? 0.4 : 1 }} />
                      <Text style={{ fontSize: 10, fontWeight: '900', color: '#2563eb' }}>Atualizar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Sub-Abas de Seleção de Período do Resumo: Hoje vs Amanhã vs Restante da Semana */}
              <View style={{
                flexDirection: 'row',
                backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
                padding: 4,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: isDarkMode ? '#334155' : '#f1f5f9',
                gap: 4
              }}>
                {[
                  { id: 'today', label: 'Hoje' },
                  { id: 'tomorrow', label: 'Amanhã' }
                ].map((tab) => {
                  const isActive = aiSummaryTab === tab.id;
                  return (
                    <TouchableOpacity
                      key={tab.id}
                      onPress={() => {
                        setAiSummaryTab(tab.id as any);
                        if (tab.id === 'today' && !aiSummaryToday) generateDeliveryAISummary('today');
                        if (tab.id === 'tomorrow' && !aiSummaryTomorrow) generateDeliveryAISummary('tomorrow');
                      }}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        paddingHorizontal: 4,
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isActive ? (isDarkMode ? '#1e293b' : '#ffffff') : 'transparent',
                        elevation: isActive ? 1 : 0
                      }}
                    >
                      <Text style={{
                        fontSize: 11,
                        fontWeight: isActive ? '900' : '700',
                        color: isActive ? '#2563eb' : (isDarkMode ? '#94a3b8' : '#64748b'),
                        textAlign: 'center'
                      }}>
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Caixa de Texto do Resumo */}
              <View style={{
                backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
                borderRadius: 16,
                padding: 14,
                borderWidth: 1,
                borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                gap: 6
              }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: isDarkMode ? '#cbd5e1' : '#334155', lineHeight: 20 }}>
                  {(aiSummaryTab === 'today' ? aiSummaryToday : aiSummaryTomorrow) || 'Carregando resumo inteligente das entregas...'}
                </Text>
              </View>

              {/* Player de Áudio Inteligente */}
              <View style={{
                backgroundColor: isDarkMode ? '#0f172a' : '#f1f5f9',
                borderRadius: 18,
                padding: 12,
                gap: 10,
                borderWidth: 1,
                borderColor: isDarkMode ? '#334155' : '#e2e8f0'
              }}>
                {/* Linha de Progresso Visual do Áudio Interativa */}
                <View
                  onLayout={(e) => {
                    timelineBarWidthRef.current = e.nativeEvent.layout.width || 280;
                  }}
                  onStartShouldSetResponder={() => true}
                  onMoveShouldSetResponder={() => true}
                  onResponderGrant={(e) => {
                    const touchX = e.nativeEvent.locationX;
                    const ratio = touchX / (timelineBarWidthRef.current || 280);
                    seekAudioToRatio(ratio);
                  }}
                  onResponderMove={(e) => {
                    const touchX = e.nativeEvent.locationX;
                    const ratio = touchX / (timelineBarWidthRef.current || 280);
                    seekAudioToRatio(ratio);
                  }}
                  style={{ height: 26, justifyContent: 'center', position: 'relative' }}
                >
                  <View style={{ height: 8, backgroundColor: isDarkMode ? '#334155' : '#cbd5e1', borderRadius: 4, overflow: 'hidden' }}>
                    <View style={{
                      height: '100%',
                      width: `${Math.min(100, Math.max(0, (speechCurrentTime / (speechTotalDuration || 1)) * 100))}%`,
                      backgroundColor: '#2563eb',
                      borderRadius: 4
                    }} />
                  </View>
                  <View style={{
                    position: 'absolute',
                    left: `${Math.min(94, Math.max(0, (speechCurrentTime / (speechTotalDuration || 1)) * 100))}%`,
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: '#2563eb',
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.25,
                    elevation: 3,
                    top: 5
                  }} />
                </View>

                {/* Controles do Player */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <TouchableOpacity
                    onPress={() => {
                      const textToSpeak = aiSummaryTab === 'today' ? aiSummaryToday : aiSummaryTomorrow;
                      handleToggleSpeech(textToSpeak);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: '#2563eb',
                      paddingVertical: 8,
                      paddingHorizontal: 16,
                      borderRadius: 12,
                      elevation: 2
                    }}
                  >
                    {isSpeakingSummary && !speechIsPaused ? (
                      <Pause size={16} color="#ffffff" fill="#ffffff" />
                    ) : (
                      <Play size={16} color="#ffffff" fill="#ffffff" style={{ marginLeft: 2 }} />
                    )}
                    <Text style={{ fontSize: 12, fontWeight: '900', color: '#ffffff' }}>
                      {isSpeakingSummary ? (speechIsPaused ? 'Continuar' : 'Continuar') : 'Ouvir Resumo'}
                    </Text>
                  </TouchableOpacity>

                  <Text style={{ fontSize: 11, fontWeight: '800', color: isDarkMode ? '#cbd5e1' : '#64748b', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                    {formatAudioTime(speechCurrentTime)} / {formatAudioTime(speechTotalDuration)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Cabeçalho de Estatísticas com Filtro de Período Geral (Posicionado ABAIXO do Resumo Inteligente) */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 4,
              marginBottom: 12,
              paddingHorizontal: 2
            }}>
              <Text style={{ fontSize: 14, fontWeight: '900', color: isDarkMode ? '#f8fafc' : '#0f172a', letterSpacing: 0.2 }}>
                Estatísticas Operacionais
              </Text>

              <TouchableOpacity
                style={styles.periodSelectButton}
                onPress={() => setShowPeriodModal(true)}
                activeOpacity={0.8}
              >
                <Calendar size={14} color="#2563eb" style={{ marginRight: 6 }} />
                <Text style={styles.periodSelectButtonText}>
                  Período: {PERIOD_OPTIONS.find(p => p.id === selectedPeriod)?.label || 'Hoje'}
                </Text>
                <ChevronDown size={14} color="#64748b" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </View>

            {/* Grid 2x2 de Estatísticas */}
            <View style={styles.statsGrid}>
              {/* Card 1: Entregas */}
              <TouchableOpacity 
                style={[styles.statCardGrid, styles.deliveryCard]}
                onPress={() => handleTabChange('entregas', `${WEB_URL}/delivery-schedule`)}
              >
                <View style={styles.statIconWrapper}>
                  <Truck size={22} color="#2563eb" />
                </View>
                {loadingStats ? (
                  <ActivityIndicator size="small" color="#2563eb" style={{ marginTop: 8 }} />
                ) : (
                  <Text style={styles.statNumber}>{deliveriesCount}</Text>
                )}
                <Text style={styles.statLabel}>Entregas</Text>
              </TouchableOpacity>

              {/* Card 2: Montagens no Depósito (Martelo Amarelo) */}
              <TouchableOpacity 
                style={[styles.statCardGrid, { backgroundColor: isDarkMode ? '#1e293b' : '#fefce8', borderColor: isDarkMode ? '#334155' : '#fef08a' }]}
                onPress={() => handleTabChange('montagens', `${WEB_URL}/assembly-schedule`)}
              >
                <View style={[styles.statIconWrapper, { backgroundColor: isDarkMode ? '#334155' : '#fef3c7' }]}>
                  <Hammer size={22} color="#eab308" />
                </View>
                {loadingStats ? (
                  <ActivityIndicator size="small" color="#eab308" style={{ marginTop: 8 }} />
                ) : (
                  <Text style={styles.statNumber}>
                    {assembliesInternalCount} <Text style={{ fontSize: 13, fontWeight: '600' }}>{assembliesInternalCount === 1 ? 'móvel' : 'móveis'}</Text>
                  </Text>
                )}
                <Text style={[styles.statLabel, { color: isDarkMode ? '#cbd5e1' : '#ca8a04' }]}>devem ser montados no depósito</Text>
              </TouchableOpacity>

              {/* Card 3: Montagens Fora / Na Entrega (Martelo Vermelho) */}
              <TouchableOpacity 
                style={[styles.statCardGrid, { backgroundColor: isDarkMode ? '#1e293b' : '#fff1f2', borderColor: isDarkMode ? '#334155' : '#fecdd3' }]}
                onPress={() => handleTabChange('logistica', `${WEB_URL}/delivery-schedule`)}
              >
                <View style={[styles.statIconWrapper, { backgroundColor: isDarkMode ? '#334155' : '#fee2e2' }]}>
                  <Hammer size={22} color="#ef4444" />
                </View>
                {loadingStats ? (
                  <ActivityIndicator size="small" color="#ef4444" style={{ marginTop: 8 }} />
                ) : (
                  <Text style={styles.statNumber}>
                    {assembliesOutsideCount} <Text style={{ fontSize: 13, fontWeight: '600' }}>{assembliesOutsideCount === 1 ? 'móvel' : 'móveis'}</Text>
                  </Text>
                )}
                <Text style={[styles.statLabel, { color: isDarkMode ? '#cbd5e1' : '#e11d48' }]}>devem ser montados na entrega</Text>
              </TouchableOpacity>

              {/* Card 3: Assistências */}
              <TouchableOpacity 
                style={[styles.statCardGrid, styles.assistanceCard]}
                onPress={() => handleTabChange('pedidos', `${WEB_URL}/sales-order`)}
              >
                <View style={styles.statIconWrapper}>
                  <Wrench size={22} color="#d97706" />
                </View>
                {loadingStats ? (
                  <ActivityIndicator size="small" color="#d97706" style={{ marginTop: 8 }} />
                ) : (
                  <Text style={styles.statNumber}>{assistancesCount}</Text>
                )}
                <Text style={styles.statLabel}>Assistências</Text>
              </TouchableOpacity>

              {/* Card 4: Devoluções */}
              <TouchableOpacity 
                style={[styles.statCardGrid, styles.returnCard]}
                onPress={() => handleTabChange('pedidos', `${WEB_URL}/sales-order`)}
              >
                <View style={styles.statIconWrapper}>
                  <RotateCcw size={22} color="#e11d48" />
                </View>
                {loadingStats ? (
                  <ActivityIndicator size="small" color="#e11d48" style={{ marginTop: 8 }} />
                ) : (
                  <Text style={styles.statNumber}>{returnsCount}</Text>
                )}
                <Text style={styles.statLabel}>Devoluções</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : currentTab === 'pedidos' ? (
          <NativeOrdersScreen isDarkMode={isDarkMode} />
        ) : (currentTab === 'entregas' || currentTab === 'logistica') ? (
          <NativeLogisticsScreen isDarkMode={isDarkMode} onSelectOrder={(order) => setAppSelectedOrder(order)} />
        ) : currentTab === 'montagens' ? (
          <NativeAssembliesScreen isDarkMode={isDarkMode} onSelectOrder={(order) => setAppSelectedOrder(order)} />
        ) : (
          <NativeReportsScreen isDarkMode={isDarkMode} />
        )}
      </View>

      {/* Barra de Navegação Nativa */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={[styles.navItem, currentTab === 'home' && styles.navItemActive]}
          onPress={() => handleTabChange('home', WEB_URL)}
        >
          <LayoutDashboard size={22} color={currentTab === 'home' ? '#2563eb' : '#94a3b8'} strokeWidth={currentTab === 'home' ? 2.5 : 2} />
          <Text style={[styles.navText, currentTab === 'home' && styles.navTextActive]}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.navItem, currentTab === 'pedidos' && styles.navItemActive]}
          onPress={() => handleTabChange('pedidos', `${WEB_URL}/mobile-orders`)}
        >
          <ShoppingBag size={22} color={currentTab === 'pedidos' ? '#2563eb' : '#94a3b8'} strokeWidth={currentTab === 'pedidos' ? 2.5 : 2} />
          <Text style={[styles.navText, currentTab === 'pedidos' && styles.navTextActive]}>Pedidos</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.navItem, (currentTab === 'entregas' || currentTab === 'logistica') && styles.navItemActive]}
          onPress={() => handleTabChange('logistica', `${WEB_URL}/schedule`)}
        >
          <Calendar size={22} color={(currentTab === 'entregas' || currentTab === 'logistica') ? '#2563eb' : '#94a3b8'} strokeWidth={(currentTab === 'entregas' || currentTab === 'logistica') ? 2.5 : 2} />
          <Text style={[styles.navText, (currentTab === 'entregas' || currentTab === 'logistica') && styles.navTextActive]}>Cronograma</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.navItem, currentTab === 'montagens' && styles.navItemActive]}
          onPress={() => handleTabChange('montagens', `${WEB_URL}/assembly-schedule`)}
        >
          <Hammer size={22} color={currentTab === 'montagens' ? '#2563eb' : '#94a3b8'} strokeWidth={currentTab === 'montagens' ? 2.5 : 2} />
          <Text style={[styles.navText, currentTab === 'montagens' && styles.navTextActive]}>Montagens</Text>
        </TouchableOpacity>

        {canSeeReports && (
          <TouchableOpacity 
            style={[styles.navItem, currentTab === 'relatorios' && styles.navItemActive]}
            onPress={() => handleTabChange('relatorios', `${WEB_URL}/mobile-reports`)}
          >
            <BarChart3 size={22} color={currentTab === 'relatorios' ? '#2563eb' : '#94a3b8'} strokeWidth={currentTab === 'relatorios' ? 2.5 : 2} />
            <Text style={[styles.navText, currentTab === 'relatorios' && styles.navTextActive]}>Relatórios</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Modal de Seleção de Período (UX Limpa) */}
      <Modal
        visible={showPeriodModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPeriodModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalBackdrop} 
          activeOpacity={1} 
          onPress={() => setShowPeriodModal(false)}
        >
          <View style={styles.periodModalContent}>
            <View style={styles.periodModalHeader}>
              <Calendar size={18} color="#2563eb" style={{ marginRight: 8 }} />
              <Text style={styles.periodModalTitle}>Selecione o Período</Text>
            </View>

            <View style={styles.periodModalOptionsList}>
              {PERIOD_OPTIONS.map((period) => {
                const isSelected = selectedPeriod === period.id;
                return (
                  <TouchableOpacity
                    key={period.id}
                    style={[
                      styles.periodModalOption,
                      isSelected && styles.periodModalOptionActive
                    ]}
                    onPress={() => {
                      handlePeriodChange(period.id);
                      setShowPeriodModal(false);
                    }}
                  >
                    <Text style={[
                      styles.periodModalOptionText,
                      isSelected && styles.periodModalOptionTextActive
                    ]}>
                      {period.label}
                    </Text>
                    {isSelected && <Check size={16} color="#2563eb" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de Perfil e Configurações (UX Premium) */}
      <Modal
        visible={showProfileModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalBackdrop} 
          activeOpacity={1} 
          onPress={() => setShowProfileModal(false)}
        >
          <View style={[styles.profileModalContent, isDarkMode && styles.modalContentDark]}>
            {/* Topo do Modal */}
            <View style={styles.profileModalTopRow}>
              <Text style={[styles.profileModalTitle, isDarkMode && styles.textPrimaryDark]}>Perfil & Configurações</Text>
              <TouchableOpacity 
                style={[styles.closeModalButton, isDarkMode && styles.iconButtonDark]}
                onPress={() => setShowProfileModal(false)}
              >
                <X size={18} color={isDarkMode ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            </View>

            {/* Cartão do Usuário */}
            <View style={[styles.profileUserCard, isDarkMode && styles.profileUserCardDark]}>
              <View style={styles.profileBigAvatar}>
                <Text style={styles.profileBigAvatarText}>
                  {(userProfile?.fullName || 'M')[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.profileUserName, isDarkMode && styles.textPrimaryDark]}>
                  {userProfile?.fullName || 'Matheus Morante'}
                </Text>
                <Text style={styles.profileUserEmail}>
                  {userProfile?.email || 'matheusmorante002@gmail.com'}
                </Text>
                <View style={styles.roleBadgeContainer}>
                  <ShieldCheck size={12} color="#10b981" style={{ marginRight: 4 }} />
                  <Text style={styles.roleBadgeText}>
                    {userProfile?.role === 'administrator' ? 'Administrador Master' : (userProfile?.role || 'Colaborador')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Menu de Ações */}
            <View style={styles.profileMenuItems}>
              {/* Botão Configurações */}
              <TouchableOpacity
                style={[styles.profileMenuItem, isDarkMode && styles.profileMenuItemDark]}
                onPress={() => {
                  setShowProfileModal(false);
                  handleTabChange('configuracoes', `${WEB_URL}/settings`);
                }}
              >
                <View style={styles.profileMenuIconWrapper}>
                  <Settings size={18} color="#2563eb" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.profileMenuLabel, isDarkMode && styles.textPrimaryDark]}>Configurações</Text>
                  <Text style={styles.profileMenuSubtext}>Preferências gerais e dados do sistema</Text>
                </View>
              </TouchableOpacity>

              {/* Botão Sair da Conta */}
              <TouchableOpacity
                style={[styles.profileMenuItem, styles.profileLogoutItem]}
                onPress={() => {
                  setShowProfileModal(false);
                  handleLogout();
                }}
              >
                <View style={[styles.profileMenuIconWrapper, { backgroundColor: '#fee2e2' }]}>
                  <LogOut size={18} color="#ef4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.profileMenuLabel, { color: '#ef4444' }]}>Sair do Aplicativo</Text>
                  <Text style={styles.profileMenuSubtext}>Encerrar sessão no dispositivo</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Popover / Painel Flutuante de Notificações pertinho do Botão (Sem Fundo Escuro) */}
      <Modal
        visible={showNotificationsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotificationsModal(false)}
      >
        <TouchableOpacity 
          style={{ flex: 1, backgroundColor: 'transparent' }} 
          activeOpacity={1} 
          onPress={() => setShowNotificationsModal(false)}
        >
          <View style={{
            position: 'absolute',
            top: Platform.OS === 'ios' ? 60 : 50,
            right: 14,
            width: 320,
            maxHeight: 450,
            backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
            borderRadius: 20,
            padding: 16,
            borderWidth: 1,
            borderColor: isDarkMode ? '#334155' : '#cbd5e1',
            elevation: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#334155' : '#f1f5f9' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Bell size={18} color="#2563eb" />
                <Text style={{ fontSize: 14, fontWeight: '900', color: isDarkMode ? '#f8fafc' : '#0f172a' }}>Notificações do Sistema</Text>
              </View>
              <TouchableOpacity onPress={() => setShowNotificationsModal(false)} style={{ padding: 4 }}>
                <X size={16} color={isDarkMode ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            </View>

            {notifications.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <Bell size={32} color="#cbd5e1" />
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748b', marginTop: 8 }}>Nenhuma notificação por enquanto</Text>
                <Text style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, textAlign: 'center' }}>Novos pedidos gerados em tempo real emitirão alerta nesta tela.</Text>
              </View>
            ) : (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 8 }}>
                {notifications.map(notif => (
                  <TouchableOpacity
                    key={notif.id}
                    onPress={() => {
                      setShowNotificationsModal(false);
                      if (notif.order) {
                        setAppSelectedOrder(notif.order);
                      }
                    }}
                    style={{
                      backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
                      borderRadius: 14,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                      gap: 4
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 12, fontWeight: '900', color: '#2563eb' }}>{notif.title}</Text>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: '#94a3b8' }}>{notif.timestamp}</Text>
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: isDarkMode ? '#cbd5e1' : '#475569' }}>{notif.message}</Text>
                    {notif.scheduleText ? (
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#2563eb', marginTop: 2 }}>{notif.scheduleText}</Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal Nativo em Tela Cheia de Detalhes do Pedido (Abertura por Notificação) */}
      <Modal
        visible={!!appSelectedOrder}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setAppSelectedOrder(null)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc' }}>
          {/* Cabeçalho Fixo do Modal */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: isDarkMode ? '#1e293b' : '#e2e8f0',
            backgroundColor: isDarkMode ? '#1e293b' : '#ffffff'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setAppSelectedOrder(null)}
                style={{ padding: 6, borderRadius: 12, backgroundColor: isDarkMode ? '#334155' : '#f1f5f9' }}
              >
                <X size={20} color={isDarkMode ? '#f8fafc' : '#0f172a'} />
              </TouchableOpacity>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '900', color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
                  Pedido #{appSelectedOrder?.id?.slice(-6).toUpperCase()}
                </Text>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>
                  Detalhes do Pedido Notificado
                </Text>
              </View>
            </View>

            <View style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 14,
              backgroundColor: '#dcfce7'
            }}>
              <Text style={{ fontSize: 11, fontWeight: '900', color: '#15803d', textTransform: 'uppercase' }}>
                {appSelectedOrder?.status || 'Recebido'}
              </Text>
            </View>
          </View>

          {/* Conteúdo com Scroll Vertical Extenso */}
          <OrderDetailsBody order={appSelectedOrder} isDarkMode={isDarkMode} />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerDark: {
    backgroundColor: '#0f172a',
    borderBottomColor: '#1e293b',
  },
  headerSubtitle: { fontSize: 8, fontWeight: '900', color: '#94a3b8', letterSpacing: 1.5 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', letterSpacing: -0.5 },
  textPrimaryDark: { color: '#f8fafc' },
  textMutedDark: { color: '#94a3b8' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badgeContainer: { position: 'relative' },
  iconButton: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  iconButtonDark: { backgroundColor: '#1e293b' },
  profileAvatarButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  redBadge: { position: 'absolute', top: -3, right: -3, backgroundColor: '#ef4444', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#ffffff' },
  badgeText: { color: '#ffffff', fontSize: 8, fontWeight: '900' },
  
  // Estilos do Modal de Perfil e Configurações
  profileModalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 22,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  modalContentDark: {
    backgroundColor: '#1e293b',
  },
  profileModalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  closeModalButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  profileUserCardDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  profileBigAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileBigAvatarText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
  },
  profileUserName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  profileUserEmail: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 2,
  },
  roleBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10b981',
  },
  profileMenuItems: {
    gap: 10,
  },
  profileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  profileMenuItemDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  profileLogoutItem: {
    backgroundColor: '#fef2f2',
    borderColor: '#fee2e2',
  },
  profileMenuIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileMenuLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e293b',
  },
  profileMenuSubtext: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },

  content: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContainer: { flex: 1, padding: 20 },
  dateHeader: { marginBottom: 16 },
  dateText: { fontSize: 11, fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 },
  welcomeText: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginTop: 4, letterSpacing: -0.5 },
  
  // Botão Select Bonito Inline
  periodSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 16,
    paddingVertical: 7,
    paddingHorizontal: 12,
    elevation: 2,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  periodSelectButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1e293b',
  },

  // Modal UX de Seleção
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  periodModalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    elevation: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  periodModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  periodModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  periodModalOptionsList: {
    gap: 6,
  },
  periodModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
  },
  periodModalOptionActive: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  periodModalOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  periodModalOptionTextActive: {
    color: '#2563eb',
    fontWeight: '900',
  },
  
  // Estilos de Filtro por Período
  periodFilterContainer: { marginBottom: 20 },
  periodFilterHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  periodFilterTitle: { fontSize: 9, fontWeight: '900', color: '#64748b', letterSpacing: 1 },
  periodChipsScroll: { gap: 8, paddingRight: 10 },
  periodChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  periodChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  periodChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  periodChipTextActive: {
    color: '#ffffff',
    fontWeight: '900',
  },

  // Grid 2x2 de Estatísticas
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 25,
  },
  statCardGrid: {
    width: '48%',
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  statsRow: { flexDirection: 'row', gap: 15, marginBottom: 25 },
  statCard: { flex: 1, padding: 20, borderRadius: 24, borderWidth: 1, elevation: 2, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10 },
  deliveryCard: { backgroundColor: '#eff6ff', borderColor: '#dbeafe' },
  assemblyCard: { backgroundColor: '#f5f3ff', borderColor: '#ede9fe' },
  assistanceCard: { backgroundColor: '#fffbeb', borderColor: '#fef3c7' },
  returnCard: { backgroundColor: '#fff1f2', borderColor: '#ffe4e6' },
  statIconWrapper: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', elevation: 1 },
  statNumber: { fontSize: 28, fontWeight: '900', color: '#0f172a', marginTop: 12, letterSpacing: -1 },
  statLabel: { fontSize: 10, fontWeight: '800', color: '#475569', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 12, fontWeight: '900', color: '#475569', textTransform: 'uppercase', letterSpacing: 1 },
  clearText: { fontSize: 10, fontWeight: '900', color: '#ef4444', textTransform: 'uppercase', letterSpacing: 0.5 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 45, backgroundColor: '#ffffff', borderRadius: 24, borderWidth: 1, borderColor: '#f1f5f9', paddingHorizontal: 20 },
  emptyIconWrapper: { width: 64, height: 64, borderRadius: 22, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
  emptyText: { fontSize: 11, fontWeight: '600', color: '#64748b', textAlign: 'center', marginTop: 6, lineHeight: 18 },
  notificationsList: { gap: 12 },
  notificationCard: { backgroundColor: '#ffffff', padding: 18, borderRadius: 24, borderWidth: 1, borderColor: '#f1f5f9', elevation: 1 },
  notificationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  notificationTitle: { fontSize: 13, fontWeight: '900', color: '#1e293b' },
  notificationTime: { fontSize: 10, color: '#64748b', fontWeight: '800' },
  notificationMessage: { fontSize: 11, fontWeight: '600', color: '#475569', lineHeight: 17 },
  actionButton: { marginTop: 14, alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#f1f5f9', borderRadius: 12 },
  actionButtonText: { fontSize: 10, fontWeight: '900', color: '#2563eb', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#334155', padding: 16, borderRadius: 20, marginTop: 25 },
  infoText: { flex: 1, fontSize: 10, fontWeight: '600', color: '#f8fafc', lineHeight: 16 },
  bottomNav: {
    height: 75,
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingBottom: 15,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  navItemActive: { margin: 2 },
  navText: { fontSize: 9, fontWeight: '800', color: '#94a3b8', marginTop: 4, letterSpacing: 0.5 },
  navTextActive: { color: '#2563eb' },
  logoutButton: { paddingVertical: 6, paddingHorizontal: 14, backgroundColor: '#fee2e2', borderRadius: 12 },
  logoutText: { fontSize: 11, fontWeight: '800', color: '#ef4444' },

  // Estilos da Tela de Login Nativa Mobile
  loginContainer: { flex: 1, backgroundColor: '#f8fafc' },
  loginScrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  loginCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 4,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
  },
  loginHeader: { alignItems: 'center', marginBottom: 28 },
  loginLogoWrapper: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    elevation: 3,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  loginLogoText: { color: '#ffffff', fontSize: 30, fontWeight: '900', fontStyle: 'italic' },
  loginTitle: { fontSize: 20, fontWeight: '900', color: '#1e293b', letterSpacing: -0.5 },
  loginSubtitle: { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 2, marginTop: 4 },
  loginErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  loginErrorText: { flex: 1, color: '#ef4444', fontSize: 11, fontWeight: '700' },
  formGroup: { marginBottom: 18 },
  inputLabel: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 1.5, marginBottom: 8, marginLeft: 2 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: { marginRight: 10 },
  textInput: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1e293b' },
  eyeButton: { padding: 4 },
  loginButton: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    elevation: 4,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  loginButtonDisabled: { opacity: 0.7 },
  loginButtonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  loginButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94a3b8',
    marginHorizontal: 12,
    letterSpacing: 1,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 16,
    height: 52,
    elevation: 1,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  googleButtonText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#334155',
    letterSpacing: 0.5,
  },
  loginFooterText: { textAlign: 'center', marginTop: 24, fontSize: 9, fontWeight: '900', color: '#cbd5e1', letterSpacing: 2 },
});
