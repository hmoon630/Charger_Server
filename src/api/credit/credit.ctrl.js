import Joi from 'joi';
import { account, charge_list } from 'models';
import { decodeToken } from 'lib/token'


export const AddCredit = async (ctx) => {
    //Joi 형식 검사
    const creditInput = Joi.object().keys({
        credit_type: Joi.boolean().required(),
        amount: Joi.number().integer().required(),
        payment_type: Joi.number().integer().required(),
    });

    const Result = Joi.validate(ctx.request.body, creditInput);

    if (Result.error) {
        console.log(`AddCredit - Joi 형식 에러`);
        ctx.status = 400;
        ctx.body = {
            "error": "001"
        }
        return;
    }

    //로그인 한 유저인가?
    const user = await decodeToken(ctx.header.token);

    if (user == null) {
        console.log(`AddCredit - 올바르지 않은 토큰입니다.`);
        ctx.status = 400;
        ctx.body = {
            "error": "009"
        }
        return;
    }

    //유저 정보 불러오기
    const founded = await account.findOne({
        where: {
            user_code: user.user_code
        }
    });

    if (founded == null) {
        console.log(`AddCredit - 존재하지 않는 계정입니다. / 유저 : ${ctx.request.body.charger}`);
        ctx.status = 400;
        ctx.body = {
            "error": "005"
        }
        return;
    }

    //충전 액수가 올바른지 확인
    if(ctx.request.body.amount <= 0){
        console.log(`AddCredit - 올바르지 않은 충전량 입니다. / 충전량 : ${ctx.request.body.amount}`);
        ctx.status = 400;
        ctx.body = {
            "error": "007"
        }
    }

    //올바른 충전 타입인지 확인
    if (ctx.request.body.payment_type < 1 || ctx.request.body.payment_type > 3){
        console.log(`AddCredit - 올바르지 않은 충전 유형입니다. / 충전 유형 : ${ctx.request.body.payment_type}`);
        ctx.status = 400;
        ctx.body = {
            "error": "008"
        }
        return;
    }


    //크레딧 지급
    if (ctx.request.body.credit_type == true) {
        const new_credit = founded.credit + ctx.request.body.amount

        await founded.update({
            credit: new_credit
        })
    }
    else {
        const new_elec = founded.electricity + ctx.request.body.amount

        await founded.update({
            electricity: new_elec
        })
    }
    
    await charge_list.create({
        "charger": user.user_code,
        "credit_type": ctx.request.body.credit_type,
        "amount": ctx.request.body.amount,
        "payment_type": ctx.request.body.payment_type,
        "credit": founded.credit,
        "electricity": founded.electricity
    });

    console.log(`AddCredit - 크레딧이 성공적으로 지급되었습니다.`);

    ctx.status = 200;
    ctx.body = {
        "credit" : founded.credit,
        "electricity" : founded.electricity
    }
    
}

export const ChargeList = async (ctx) => {
    //로그인 한 유저는 누구인가?
    const user = await decodeToken(ctx.header.token);

    if (user == null) {
        console.log(`ChargeList - 올바르지 않은 토큰입니다.`);
        ctx.status = 400;
        ctx.body = {
            "error": "009"
        }
        return;
    }

    //유저의 충전 정보 불러오기
    const list = await charge_list.findAll({
        where : {
            charger : user.user_code
        }
    });

    let chargeArray = [];

    for(var i in list){
        const record = {
            credit_type : list[i].credit_type,
            amount : list[i].amount,
            charged_at : list[i].charged_at,
            payment_type : list[i].payment_type,
            credit : list[i].credit,
            electricity : list[i].electricity
        }
        chargeArray.push(record);
    }

    console.log(`ChargeList - 충전 목록을 반환하였습니다.`)

    ctx.status = 200;
    ctx.body = {
        "charge_list" : chargeArray
    }
}