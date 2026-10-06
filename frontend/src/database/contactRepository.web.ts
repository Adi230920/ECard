import { Contact, ContactInsert } from '../types/contact';

export class ContactRepository {
  async init() {}
  
  async getRecent(limit: number = 5): Promise<Contact[]> { 
    return []; 
  }
  
  async getAll(): Promise<Contact[]> { 
    return []; 
  }
  
  async getById(id: number): Promise<Contact | null> { 
    return null; 
  }
  
  async insert(contact: ContactInsert): Promise<number> { 
    return 1; 
  }
  
  async update(id: number, contact: Partial<ContactInsert>): Promise<void> {}
  
  async deleteContact(id: number): Promise<void> {}
  
  async search(query: string): Promise<Contact[]> { 
    return []; 
  }
}

export const contactRepository = new ContactRepository();
