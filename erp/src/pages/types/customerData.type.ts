import FullAddress from "./fullAddress.type"

type CustomerData = {
    id?: string,
    fullName: string,
    phone: string,
    email?: string,
    cpfCnpj?: string,
    noPhone?: boolean,
    fullAddress: FullAddress
}

export default CustomerData