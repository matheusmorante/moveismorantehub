import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MessageCircle, UserCheck } from 'lucide-react-native';
import { supabase } from '../../../../services/supabaseClient';
import { formatOrderCode } from '../../../../utils/orderUtils';
import { buildPostgrestAccentInsensitivePattern } from '../../../../../../shared-utils/core/searchText';

interface Props {
  order: any;
  isDarkMode?: boolean;
}

export const DeliveryQuickContactBar: React.FC<Props> = ({ order, isDarkMode }) => {
  const data = order.order_data || order;
  const customer = data.customerData || data.customer || {};
  const customerName = customer.fullName || customer.name || order.customer_name || 'Cliente';
  const orderNumber = formatOrderCode(order);

  const rawSellerName =
    order.seller || data.seller || data.sellerName || data.sellerData?.fullName || '';
  const [sellerPhone, setSellerPhone] = useState<string>(
    data.sellerPhone || data.sellerData?.phone || order.seller_phone || ''
  );
  const [sellerName, setSellerName] = useState<string>(rawSellerName || 'Vendedor');
  const [isSellerLookupLoading, setIsSellerLookupLoading] = useState(false);
  const sellerLookupRef = useRef<{
    sellerName: string;
    promise: Promise<{ phone: string | null; full_name: string | null } | null>;
  } | null>(null);
  const sellerContactInProgressRef = useRef(false);

  const getSellerProfile = useCallback((sellerNameToFind: string) => {
    const pendingLookup = sellerLookupRef.current;
    if (pendingLookup?.sellerName === sellerNameToFind) return pendingLookup.promise;

    let lookupPromise: Promise<{ phone: string | null; full_name: string | null } | null>;
    lookupPromise = Promise.resolve(
      supabase
        .from('profiles')
        .select('phone, full_name')
        .filter(
          'full_name',
          'imatch',
          buildPostgrestAccentInsensitivePattern(sellerNameToFind)
        )
        .limit(1)
    )
      .then(({ data: profiles, error }) => {
        if (error) throw error;
        return profiles?.[0] ?? null;
      })
      .finally(() => {
        if (sellerLookupRef.current?.promise === lookupPromise) {
          sellerLookupRef.current = null;
        }
      });

    sellerLookupRef.current = { sellerName: sellerNameToFind, promise: lookupPromise };
    return lookupPromise;
  }, []);

  // Buscar telefone do vendedor no Supabase se não estiver no pedido
  useEffect(() => {
    if (!sellerPhone && rawSellerName) {
      let isCurrentSeller = true;
      getSellerProfile(rawSellerName)
        .then(profile => {
          if (!isCurrentSeller || !profile?.phone) return;
          setSellerPhone(profile.phone);
          if (profile.full_name) setSellerName(profile.full_name);
        })
        .catch(() => {
          // A busca em segundo plano pode ser repetida quando a pessoa tocar no botão.
        });

      return () => {
        isCurrentSeller = false;
      };
    }
  }, [getSellerProfile, rawSellerName, sellerPhone]);

  const cleanPhone = (phone: string) => {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length === 10 || digits.length === 11) return `55${digits}`;
    return digits;
  };

  const handleContactCustomer = () => {
    const rawPhone =
      customer.phone ||
      customer.cellphone ||
      customer.mobilePhone ||
      customer.whatsapp ||
      data.customerPhone ||
      order.customer_phone;
    const phone = cleanPhone(rawPhone);

    if (!phone) {
      Alert.alert(
        'Contato do Cliente',
        'Nenhum telefone/WhatsApp foi cadastrado para este cliente.'
      );
      return;
    }

    const message = encodeURIComponent(
      `Olá ${customerName}, tudo bem? Sou da equipe de entrega da Morante Móveis referente ao seu Pedido #${orderNumber}.`
    );
    const url = `https://wa.me/${phone}?text=${message}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp no seu dispositivo.');
    });
  };

  const handleContactSeller = async () => {
    if (sellerContactInProgressRef.current) return;

    let phone = cleanPhone(sellerPhone);

    // Se ainda não achou telefone, busca na tabela de colaboradores/vendedores
    if (!phone && rawSellerName) {
      sellerContactInProgressRef.current = true;
      setIsSellerLookupLoading(true);
      try {
        const profile = await getSellerProfile(rawSellerName);
        if (profile?.phone) {
          phone = cleanPhone(profile.phone);
          setSellerPhone(profile.phone);
        }
      } catch {
        Alert.alert('Erro', 'Não foi possível buscar o telefone do vendedor. Tente novamente.');
        return;
      } finally {
        sellerContactInProgressRef.current = false;
        setIsSellerLookupLoading(false);
      }
    }

    if (!phone) {
      Alert.alert(
        'Contato do Vendedor',
        `Não encontramos o número de WhatsApp cadastrado para o vendedor "${sellerName}".`
      );
      return;
    }

    const message = encodeURIComponent(
      `Olá ${sellerName}, tudo bem? Estou na entrega do Pedido #${orderNumber} do cliente ${customerName}.`
    );
    const url = `https://wa.me/${phone}?text=${message}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp no seu dispositivo.');
    });
  };

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* Botão Falar com o Cliente */}
      <TouchableOpacity
        onPress={handleContactCustomer}
        style={[styles.btn, styles.clientBtn]}
        activeOpacity={0.85}
      >
        <MessageCircle size={17} color="#ffffff" />
        <View style={{ flexShrink: 1 }}>
          <Text style={styles.btnTitle} numberOfLines={1}>
            Falar com Cliente
          </Text>
          <Text style={styles.btnSub} numberOfLines={1}>
            {customerName}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Botão Falar com o Vendedor */}
      <TouchableOpacity
        onPress={handleContactSeller}
        style={[styles.btn, styles.sellerBtn]}
        activeOpacity={0.85}
        disabled={isSellerLookupLoading}
      >
        <UserCheck size={17} color="#ffffff" />
        <View style={{ flexShrink: 1 }}>
          <Text style={styles.btnTitle} numberOfLines={1}>
            {isSellerLookupLoading ? 'Buscando telefone…' : 'Falar com Vendedor'}
          </Text>
          <Text style={styles.btnSub} numberOfLines={1}>
            {sellerName}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  containerDark: {
    backgroundColor: '#1e293b',
    borderBottomColor: '#334155',
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    elevation: 2,
  },
  clientBtn: {
    backgroundColor: '#16a34a',
  },
  sellerBtn: {
    backgroundColor: '#2563eb',
  },
  btnTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  btnSub: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 10,
    fontWeight: '700',
  },
});
