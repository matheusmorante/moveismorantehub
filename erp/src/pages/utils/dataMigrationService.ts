import { db as firebaseDb } from "./firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { supabase } from '@/pages/utils/supabaseConfig';
import { toast } from "react-toastify";

export const migrateAllData = async () => {
    const id = toast.loading("Iniciando migração de dados do Firebase para Supabase...");
    
    try {
        // 1. Migrar Configurações
        const settingsSnap = await getDocs(collection(firebaseDb, "metadata"));
        const appSettings = settingsSnap.docs.find(doc => doc.id === "appSettings")?.data();
        if (appSettings) {
            await supabase.from("settings").upsert({ id: "app", data: appSettings });
        }
        toast.update(id, { render: "Configurações migradas...", type: "default", isLoading: true });

        // 2. Migrar Produtos
        const productsSnap = await getDocs(collection(firebaseDb, "products"));
        const products = productsSnap.docs.map(doc => {
            const data = doc.data();
            return {
                code: data.code,
                description: data.description,
                category: data.category,
                unit_price: data.unitPrice || 0,
                cost_price: data.costPrice || 0,
                freight_cost: data.freightCost || 0,
                stock: data.stock || 0,
                active: data.active ?? true,
                deleted: data.deleted ?? false,
                images: data.images || [],
                updated_at: new Date().toISOString()
            };
        });
        if (products.length > 0) await supabase.from("products").insert(products);
        toast.update(id, { render: `${products.length} Produtos migrados...`, type: "default", isLoading: true });

        // 3. Migrar Pessoas (Clientes, Fornecedores, Funcionários)
        const personTypes = ["customers", "suppliers", "employees"];
        for (const type of personTypes) {
            const snap = await getDocs(collection(firebaseDb, type));
            const people = snap.docs.map(doc => {
                const data = doc.data();
                return {
                    person_type: type,
                    full_name: data.fullName || "Sem Nome",
                    phone: data.phone,
                    email: data.email,
                    cpf_cnpj: data.cpfCnpj,
                    address: data.address || {},
                    active: data.active ?? true,
                    deleted: data.deleted ?? false,
                    updated_at: new Date().toISOString()
                };
            });
            if (people.length > 0) await supabase.from("people").insert(people);
        }
        toast.update(id, { render: "Clientes e contatos migrados...", type: "default", isLoading: true });

        // 4. Migrar Pedidos (Orders)
        const ordersSnap = await getDocs(collection(firebaseDb, "orders"));
        const orders = ordersSnap.docs.map(doc => {
            const data = doc.data();
            return {
                order_data: data,
                updated_at: new Date().toISOString()
            };
        });
        if (orders.length > 0) await supabase.from("orders").insert(orders);
        toast.update(id, { render: `${orders.length} Pedidos migrados!`, type: "default", isLoading: true });

        // 5. Migrar Serviços e Variações
        const servicesSnap = await getDocs(collection(firebaseDb, "services"));
        if (!servicesSnap.empty) {
            await supabase.from("services").insert(servicesSnap.docs.map(d => ({ service_data: d.data() })));
        }

        const variationsSnap = await getDocs(collection(firebaseDb, "variations"));
        if (!variationsSnap.empty) {
            await supabase.from("variations").insert(variationsSnap.docs.map(d => ({ variation_data: d.data() })));
        }

        toast.update(id, { 
            render: "Migração Concluída com Sucesso! Recarregue a página.", 
            type: "success", 
            isLoading: false,
            autoClose: 5000 
        });

    } catch (error) {
        console.error("Erro na migração:", error);
        toast.update(id, { 
            render: "Erro ao migrar dados. Verifique o console.", 
            type: "error", 
            isLoading: false,
            autoClose: 5000 
        });
    }
};
