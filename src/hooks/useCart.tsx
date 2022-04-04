import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

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

class OutOffStockError extends Error {
  constructor() {
    super('Quantidade solicitada fora de estoque');
    this.name = 'OutOffStockError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

class ProductNotExistError extends Error {
  constructor() {
    super('Product Not Exist');
    this.name = 'ProductNotExistError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
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



  const saveCart = (cart: Product[]) => {
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
    setCart(cart)
  }

  const checkStock = async (productId: number, amount: number) => {
    const stock = await api.get(`/stock/${productId}`)
    const stockAmount = stock.data.amount;

    if (amount > stockAmount) {
      throw new OutOffStockError()
    }

  }


  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productExist = updatedCart.find((product) => product.id === productId)

      const amount = productExist ? productExist.amount + 1 : 1;

      await checkStock(productId, amount)

      if (productExist) {
        productExist.amount = amount;
        saveCart(updatedCart)
        return;
      }

      const product = await api.get<Product>(`/products/${productId}`)

      updatedCart.push({
        ...product.data,
        amount
      })

      saveCart(updatedCart)
    } catch (error) {
      if (error instanceof OutOffStockError) {
        toast.error(error.message);
      } else {
        toast.error('Erro na adição do produto');
      }
    }
  };

  const removeProduct = (productId: number) => {
    try {

      const productExist = cart.find((product) => product.id === productId)

      if (!productExist) {
        throw new ProductNotExistError()
      }

      const updatedCart = cart.filter((product) => product.id !== productId)
      saveCart(updatedCart)
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {

      const updatedCart = [...cart];
      const productExist = updatedCart.find((product) => product.id === productId)


      if (!productExist) {
        throw new ProductNotExistError()
      }


      if (amount <= 0) {
        return;
      }

      await checkStock(productId, amount)
      productExist.amount = amount;
      saveCart(updatedCart)

    } catch (error) {
      if (error instanceof OutOffStockError) {
        toast.error(error.message);
      } else {
        toast.error('Erro na alteração de quantidade do produto');
      }
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
