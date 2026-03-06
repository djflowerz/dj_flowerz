export default function handler(req: any, res: any) {
    res.status(200).json({ status: 'nested-ts-ok', time: new Date().toISOString() });
}
