// app/login.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { AppLogo } from '@/components/icons';
import { useAuth } from '@/contexts/auth-context';
import { auth } from '@/lib/firebase';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';

export default function login() {
  const router = useRouter();
  const { toast } = useToast();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      toast({ title: 'Email and password required', variant: 'destructive' });
      Alert.alert('Login Failed', 'Email and password required.');
      return;
    }
    setIsLoading(true);
    try {
      await login!(email.trim(), password);
      toast({ title: 'Logged in successfully!', variant: 'success' });
      router.replace('/tasks/page');
    } catch (error: any) {
      let description = 'An unexpected error occurred. Please try again.';
      if (
        error?.code === 'auth/user-not-found' ||
        error?.code === 'auth/wrong-password' ||
        error?.code === 'auth/invalid-credential'
      ) {
        description = "Invalid credentials. Check your email and password, or sign up.";
      }
      toast({ title: 'Login Failed', description, variant: 'destructive' });
      Alert.alert('Login Failed', description);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      toast({ title: 'Email required', description: 'Enter your email to reset password.', variant: 'destructive' });
      Alert.alert('Email required', 'Enter your email to reset password.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      toast({ title: 'Password Reset Email Sent', description: `If an account exists for ${email}, a reset link was sent.` });
      Alert.alert('Password Reset', `If an account exists for ${email}, a reset link was sent.`);
    } catch (e: any) {
      toast({ title: 'Password Reset Failed', description: 'Please try again later.', variant: 'destructive' });
      Alert.alert('Password Reset Failed', 'Please try again later.');
    }
  };

  return (
    <LinearGradient colors={['#6d28d9', '#9333ea', '#111827']} style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            {/* Back Button */}
            <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/')}>
              <ArrowLeft size={22} color="#9333ea" />
            </TouchableOpacity>

            <View style={styles.logoContainer}>
              <Link href="/" asChild>
                <TouchableOpacity style={styles.logoRow}>
                  <AppLogo style={styles.logoIcon} />
                  <Text style={styles.logoText}>G-Remind</Text>
                </TouchableOpacity>
              </Link>
            </View>

            <Text style={styles.title}>Log In</Text>
            <Text style={styles.description}>Enter your email below to log in to your account</Text>

            <View style={styles.form}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="m@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                editable={!isLoading}
              />

              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="••••••••"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  editable={!isLoading}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  {showPassword ? <EyeOff size={20} color="#aaa" /> : <Eye size={20} color="#aaa" />}
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.primaryButton} onPress={handleLogin} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Log In</Text>}
              </TouchableOpacity>

              {/* Centered Forgot Password */}
              <TouchableOpacity onPress={handlePasswordReset} disabled={isLoading} style={styles.forgotCenter}>
                <Text style={styles.forgotPassword}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.footerText}>
              Don’t have an account?{' '}
              <Link href="/signup" asChild>
                <Text style={styles.footerLink}>Sign up</Text>
              </Link>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 16 },
  card: { backgroundColor: 'rgba(17, 17, 27, 0.7)', borderRadius: 16, padding: 20 },
  backButton: { position: 'absolute', top: 16, left: 16, zIndex: 1 },
  logoContainer: { alignItems: 'center', marginBottom: 12 },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logoIcon: { height: 32, width: 32, color: '#6d28d9' },
  logoText: { fontSize: 22, fontWeight: 'bold', marginLeft: 8, color: '#9333ea' },
  title: { fontSize: 20, fontWeight: '700', marginTop: 10, color: '#fff' },
  description: { color: '#aaa', marginBottom: 16 },
  form: { gap: 12 },
  label: { color: '#fff', marginTop: 8 },
  input: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 10, color: '#fff', marginTop: 6 },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  eyeButton: { paddingHorizontal: 8 },
  primaryButton: { backgroundColor: '#6d28d9', padding: 14, borderRadius: 8, marginTop: 12, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '600' },
  forgotCenter: { alignItems: 'center', marginTop: 12 },
  forgotPassword: { fontSize: 13, textDecorationLine: 'underline', color: '#aaa' },
  footerText: { marginTop: 14, textAlign: 'center', color: '#ccc' },
  footerLink: { textDecorationLine: 'underline', color: '#6d28d9' },
});
