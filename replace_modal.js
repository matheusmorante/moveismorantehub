const fs = require('fs');
const path = 'c:/Users/mathe/OneDrive/Área de Trabalho/projetos/morantehub/mobile/src/features/compositions/modals/MobileCompositionFormModal.tsx';
let content = fs.readFileSync(path, 'utf8');

const searchSection = `
            <View style={{ marginBottom: 16 }}>
                <Text style={{ color: themeColors.text, fontWeight: 'bold', fontSize: 14, marginBottom: 8 }}>+ Adicionar Produto</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: themeColors.surface, borderRadius: 8, borderWidth: 1, borderColor: themeColors.border, paddingHorizontal: 12 }}>
                    <Ionicons name="search" size={16} color={themeColors.textMuted} />
                    <TextInput
                        style={{ flex: 1, padding: 12, color: themeColors.text }}
                        placeholder="Buscar por nome ou código..."
                        placeholderTextColor={themeColors.textMuted}
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                    />
                </View>

                {searching && <Text style={{ fontSize: 12, color: themeColors.textMuted, marginTop: 4 }}>Buscando...</Text>}
                {!searching && searchError && <Text style={{ fontSize: 12, color: themeColors.danger, marginTop: 4 }}>Erro ao buscar produtos.</Text>}
                {!searching && !searchError && searchTerm.length >= 2 && results.length === 0 && <Text style={{ fontSize: 12, color: themeColors.textMuted, marginTop: 4 }}>Nenhum produto encontrado.</Text>}

                {results.length > 0 && (
                    <View style={{ borderWidth: 1, borderColor: themeColors.border, borderRadius: 8, backgroundColor: themeColors.surface, marginTop: 4, overflow: 'hidden' }}>
                        {results.map((r, i) => (
                            <TouchableOpacity key={i} style={{ padding: 12, borderBottomWidth: i < results.length - 1 ? 1 : 0, borderBottomColor: themeColors.border }} onPress={() => handleAddItem(r)}>
                                <Text style={{ fontSize: 12, fontWeight: 'bold', color: themeColors.text }}>{r.name}{r.variationName ? ' - ' + r.variationName : ''}</Text>
                                <Text style={{ fontSize: 11, color: themeColors.textMuted }}>{r.variationSku || r.code} • R$ {Number(r.variationPrice ?? r.price ?? r.unit_price ?? 0).toFixed(2)} • Estoque: {Number(r.variationStock ?? r.stock ?? 0)}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>
`;

content = content.replace(/<TouchableOpacity[\s\S]*?setIsProductSearchOpen\(true\)[\s\S]*?<\/TouchableOpacity>/, searchSection);

fs.writeFileSync(path, content, 'utf8');
