import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  User, 
  onAuthStateChanged,
  IdTokenResult
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// CRITICAL: Firestore must be initialized with the specific databaseId per guidelines
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider
};
export type { User, IdTokenResult };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection silently per skill requirements
async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client offline check:', error.message);
    }
  }
}
if (typeof window !== 'undefined') {
  testFirestoreConnection();
}

/**
 * Configured Owner UID.
 * Can be provided via VITE_FIREBASE_OWNER_UID or falls back to storage/configured id.
 */
export const CONFIGURED_OWNER_UID = 
  import.meta.env.VITE_FIREBASE_OWNER_UID || 
  (typeof window !== 'undefined' ? localStorage.getItem('podwave_configured_owner_uid') || '' : '');

export interface OwnerCheckResult {
  isOwner: boolean;
  user: User | null;
  uid: string | null;
  hasOwnerClaim: boolean;
  matchesOwnerUid: boolean;
  errorMessage?: string;
}

/**
 * Validates whether the currently authenticated Firebase user is the exclusive OWNER.
 * Requires simultaneously:
 * 1. User authenticated
 * 2. UID equals the configured Owner UID (if configured)
 * 3. Custom claim `owner: true` in decoded token
 */
export async function verifyOwnerPrivileges(user: User | null): Promise<OwnerCheckResult> {
  if (!user) {
    return {
      isOwner: false,
      user: null,
      uid: null,
      hasOwnerClaim: false,
      matchesOwnerUid: false,
      errorMessage: 'Nenhum usuário autenticado.',
    };
  }

  try {
    // Force refresh token to get fresh custom claims
    const idTokenResult: IdTokenResult = await user.getIdTokenResult(true);
    const hasOwnerClaim = Boolean(idTokenResult.claims && idTokenResult.claims.owner === true);

    const configuredUid = CONFIGURED_OWNER_UID || (typeof window !== 'undefined' ? localStorage.getItem('podwave_configured_owner_uid') || '' : '');

    // If configuredUid is set, verify match; otherwise accept if claim owner: true is present
    const matchesOwnerUid = configuredUid ? user.uid === configuredUid : true;

    // Both claim and UID must validate (or if claims owner is true)
    const isOwner = hasOwnerClaim && matchesOwnerUid;

    return {
      isOwner,
      user,
      uid: user.uid,
      hasOwnerClaim,
      matchesOwnerUid,
      errorMessage: !isOwner 
        ? !hasOwnerClaim 
          ? 'Conta autenticada não possui a claim administrativa "owner: true".' 
          : 'UID da conta não confere com o UID exclusivo do Proprietário cadastrado.'
        : undefined,
    };
  } catch (err) {
    return {
      isOwner: false,
      user,
      uid: user.uid,
      hasOwnerClaim: false,
      matchesOwnerUid: false,
      errorMessage: err instanceof Error ? err.message : 'Falha ao validar credenciais.',
    };
  }
}

/**
 * Logs an administrative audit event in Firestore
 */
export async function logAuditEvent(action: string, entity: string, details: string) {
  try {
    const user = auth.currentUser;
    await addDoc(collection(db, 'auditLogs'), {
      ownerUid: user?.uid || 'system',
      ownerEmail: user?.email || 'proprietario@podwave.com',
      action,
      entity,
      details,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Audit log write error (fallback local):', error);
  }
}
