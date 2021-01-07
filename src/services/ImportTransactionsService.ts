import { getCustomRepository, getRepository, In } from 'typeorm';
import csvParce from 'csv-parse';
import fs from 'fs';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

import TransactionsRepository from '../repositories/TransactionsRepository';

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const categoriesRepository = getRepository(Category);

    const contactsReadStream = fs.createReadStream(filePath);

    const parcers = csvParce({ from_line: 2 });

    const parceCSV = contactsReadStream.pipe(parcers);

    const transactions: CSVTransaction[] = [];
    const categories: string[] = [];

    parceCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value) return;

      categories.push(category);
      transactions.push({ title, type, value, category });
    });

    await new Promise(resolve => parceCSV.on('end', resolve));

    const existentsCategories = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });
    console.log(existentsCategories);

    const existensCategoriesTitle = existentsCategories.map(
      (category: Category) => category.title,
    );

    const addCategoriesTitle = categories
      .filter(category => !existensCategoriesTitle.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoriesRepository.create(
      addCategoriesTitle.map(title => ({
        title,
      })),
    );
    await categoriesRepository.save(newCategories);

    const finalCategories = [...newCategories, ...existentsCategories];

    const createdTransactions = transactionsRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionsRepository.save(createdTransactions);

    await fs.promises.unlink(filePath);
    return createdTransactions;
  }
}

export default ImportTransactionsService;
