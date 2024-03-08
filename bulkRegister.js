const ethers = require('ethers')
const fs = require('fs');
const abi = require('./abi.json')
const config = require('./config.js')

const sleep = function (ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const addressENS = config.contract
const addr = config.fromAddress
const secret = config.secret
const duration = config.duration
const privateKey = config.privateKey
const provider = new ethers.providers.JsonRpcProvider(config.Mainnet)
const wallet = new ethers.Wallet(privateKey, provider)
const contract = new ethers.Contract(addressENS, abi, wallet)

// 批量注册
const registerAll = async () => {
    try {
        const names = fs.readFileSync('./zhuce.txt').toString()
        const namesArr = names.split('\r\n')
        console.log(`${namesArr}.eth域名批量查询中...`);
        const res = await contract.availableAll(namesArr)
        const ensNames = res.filter(i => i != '')
        console.log(`可注册的域名${ensNames.length}个:`);
        console.log(ensNames);
// 域名费用----------------------------------------
        const cost = await contract.rentPrice(ensNames, duration)
        const value = ethers.utils.formatEther(cost)
        console.log(`域名费用:${value} ETH`);
// gas费用-----------------------------------------------------------------------     
        const gasLimit = 210000*ensNames.length
        const feeData = await provider.getFeeData()
        const gasWei = feeData.maxFeePerGas.mul(gasLimit)
        const gasETH = ethers.utils.formatEther(gasWei)
        console.log(`gas费用:${gasETH} ETH`)
// 判断余额是否足够 提交commit ------------------------------------------------------------
        const costAll = cost.add(gasWei)
        console.log(`总费用:${ethers.utils.formatEther(costAll)} ETH`)
        const balance = await provider.getBalance(addr)
        console.log(`当前账户余额:${ethers.utils.formatEther(balance)} ETH`);
        console.log(`预计结余:${ethers.utils.formatEther(balance.sub(costAll))} ETH`)
        if(balance.sub(costAll) <= 0) return console.log('账户余额不足!');
        console.log('提交commit中...')
        const cmt = await contract.commitAll(ensNames, addr, secret)
        await cmt.wait()
        console.log('完成commit提交,请等待1分钟...')
// 提交register------------------------------------------------------------
        await sleep(62000)
        console.log('提交注册中...');
        const tx = await contract.registerAll(ensNames, addr, duration, secret, {
            gasLimit: gasLimit,
            value: cost
        })
        console.log(`等待交易上链...`)
        await tx.wait()
        console.log(`提示:域名${ensNames}.eth已经注册成功!`);
        const bal = await provider.getBalance(addr)
        console.log(`余额:${ethers.utils.formatEther(bal)}`);
    } catch (error) {
        console.log(error);
    }
}

// 批量续费
const renewAll = async () => {
    try {
        const duration = 31536000
        const names = fs.readFileSync('./xufei.txt').toString()
        // const ensNames = names.split(',')
        const ensNames = names.split('\r\n')
        console.log(`即将为以下域名续费:`)
        console.log(ensNames)
// 域名费用----------------------------------------
        const cost = await contract.rentPrice(ensNames, duration)
        const value = ethers.utils.formatEther(cost)
        console.log(`续费费用:${value} ETH`);
// gas费用----------------------------------------------------------------------- 
        const gasLimit = 150000*ensNames.length
        const feeData = await provider.getFeeData()
        console.log(ethers.utils.formatUnits(feeData.maxFeePerGas,'gwei'));
        const gasWei = feeData.maxFeePerGas.mul(gasLimit)
        const gasETH = ethers.utils.formatEther(gasWei)
        console.log(`gas费用:${gasETH} ETH`)
// 总费用-----------------------------------------------
        const costAll = cost.add(gasWei)
        console.log(`总费用:${ethers.utils.formatEther(costAll)} ETH`)
        const balance = await provider.getBalance(addr)
        console.log(`当前账户余额:${ethers.utils.formatEther(balance)} ETH`);
        console.log(`预计结余:${ethers.utils.formatEther(balance.sub(costAll))} ETH`)
// 判断余额是否足够------------------------------------------------------------
        if(balance.sub(costAll) <= 0) return console.log('账户余额不足!');
        console.log(`${ensNames}.eth提交续费中...`);
        // return
        const tx = await contract.renewAll(ensNames, duration, {
            gasLimit: gasLimit,
            value: cost,
        })
        console.log(`等待交易上链...`)
        await tx.wait()
        console.log(`${ensNames}.eth已经续费成功!`);
        const bal = await provider.getBalance(addr)
        console.log(`余额:${ethers.utils.formatEther(bal)}`);
    } catch (error) {
        console.log(error);
    }
}

// registerAll()
renewAll()

