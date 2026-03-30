import FullAddress from "./fullAddress.type"

type CustomerData = {
    id?: string,
    fullName: string,
    phone: string,
    email?: string,
    cpfCnpj?: string,
    noPhone?: boolean,
    fullAddress: FullAddress,
    additionalContacts?: { name: string; phone: string }[],
    observations?: string
}

export default CustomerData