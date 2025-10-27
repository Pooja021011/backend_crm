import { buyerRepository } from '../repositories/buyerRepository.js';

export const buyerService = {
  getAllBuyers: () => buyerRepository.findAll(),
  createBuyer: (data: { firstName: string; lastName: string; phone: string; email: string; segmentation?: string; criteria?: any }) => 
    buyerRepository.create(data),
};

