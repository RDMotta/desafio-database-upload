import { getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';

import TransactionsRepository from '../repositories/TransactionsRepository';
import Transaction from '../models/Transaction';

class DeleteTransactionService {
  public async execute(id: string): Promise<void> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const transactionsItem = await transactionsRepository.findOne(id);

    if (!transactionsItem) {
      throw new AppError('Transaction does not exists');
    }

    await transactionsRepository.remove(transactionsItem);
  }
}

export default DeleteTransactionService;
