import FullAddress from "./fullAddress.type"

type CustomerData = {
    fullName: string,
    phone: string,
    email?: string,
    cpfCnpj?: string,
    noPhone?: boolean,
    fullAddress: FullAddress
}

export default CustomerData