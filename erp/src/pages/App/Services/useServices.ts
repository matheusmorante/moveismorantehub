import { useState, useEffect } from 'react';
import Service from '../../types/service.type';
import { subscribeToServices, moveToTrash } from '../../utils/serviceService';
import { toast } from 'react-toastify';

export const useServices = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToServices((data) => {
      setServices(data.filter((s) => !s.deleted));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await moveToTrash(id);
      toast.success('Serviço movido para a lixeira.');
    } catch {
      toast.error('Erro ao apagar serviço.');
    }
  };

  return { services, loading, handleDelete };
};
