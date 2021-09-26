import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const dontHaveStock = async (productId: number, amount: number): Promise<boolean> => {
    return (await api.get<Stock>(`/stock/${productId}`)).data.amount < amount
  }

  const addProduct = async (productId: number) => {
    try {
      const amount = cart.find(p => p.id === productId)?.amount ?? 0
      if (await dontHaveStock(productId, amount + 1)) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      let updateCart!: Product[]
      if (amount > 0) {
        updateCart = cart.map(product => ({
          ...product,
          amount: product.id === productId 
            ? product.amount + 1 
            : product.amount,
        }))
      } else {
        const newProcuct = (await api.get<Product>(`/products/${productId}`)).data
        updateCart = [...cart, {
          ...newProcuct,
          amount: 1
        }]
      }

      setCart(updateCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart))
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if(!cart.find(p => p.id === productId)) {
        throw Error()
      }
      
      const updateCart = [...cart.filter(p => p.id !== productId)]

      setCart(updateCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart))
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return
      }

      if (await dontHaveStock(productId, amount)) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }
      
      const updatedCart = cart.map(product => ({
        ...product,
        amount: product.id === productId 
          ? product.amount + 1 
          : product.amount
      }))

      setCart(updatedCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
