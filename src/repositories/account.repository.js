const Account = require('../entities/schemas/account.schema');
const QueueRepository = require('../repositories/queue.repository');
const RedisRepository = require('../repositories/redis.repository')

class AccountRepository {
  constructor(queueUrl, exchangeName) {
    this.queueRepository = new QueueRepository(queueUrl, exchangeName);
    this.redisRepository = new RedisRepository();
  }

  async create(account) {
    const newAccount = new Account(account);
    try {
      await newAccount.save();
      const message = JSON.stringify({
        type: 'create',
        account: newAccount.toObject(),
      });
      const routingKey = 'create';
      await this.queueRepository.sendMessage(message, routingKey);

      return newAccount.toObject();
    } catch (err) {
      return ({ error: err.message })
    }
  }

  async getById(id) {
    try {
      const redisKey = `account:${id}`;
      let account = await this.redisRepository.getByIdRedis(redisKey);
    if (!account) {
      account = await Account.findById(id).lean();
      if (account) {
        await this.redisRepository.save(redisKey, account);
      }
    }
    return account;
    } catch (err) {
      return ({ error: err.message })
    }
  }

  async update(account) {
    try {
      const updatedAccount = await Account.findOneAndUpdate(account.id, account, {
        new: true,
        runValidators: true
      }).lean();
      const message = JSON.stringify({
        type: 'update',
        account: updatedAccount,
      });
      const routingKey = 'update';
      await this.queueRepository.sendMessage(message, routingKey);

      return updatedAccount;
    } catch (err) {
      return ({ error: err.message })
    }
  }

  async delete(id) {
    const deletedAccount = await Account.findByIdAndDelete(id).lean();
    const message = JSON.stringify({
      type: 'delete',
      account: deletedAccount,
    });
    const routingKey = 'delete';
    await this.queueRepository.sendMessage(message, routingKey);

    return deletedAccount;
  }
}

module.exports = AccountRepository;
