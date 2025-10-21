// app/signup.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { AppLogo } from '@/components/icons';
import { useAuth } from '@/contexts/auth-context';
import { auth } from '@/lib/firebase';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';

export default function signup() {
  const router = useRouter();
  const { toast } = useToast();
  const { signup } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleForgotInSignup = async () => {
    if (!email) {
      toast({ title: 'Email required', description: 'Enter your email to reset password.', variant: 'destructive' });
      Alert.alert('Email required', 'Enter your email to reset password.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      toast({ title: 'Password Reset Email Sent', description: `If an account exists for ${email}, a reset link was sent.` });
      Alert.alert('Password Reset', `If an account exists for ${email}, a reset link was sent.`);
    } catch {
      toast({ title: 'Password Reset Failed', description: 'Please try again later.', variant: 'destructive' });
      Alert.alert('Password Reset Failed', 'Please try again later.');
    }
  };

  const handleSignUp = async () => {
    if (!name || !email || !password || !confirmPassword) {
      toast({ title: 'All fields required', variant: 'destructive' });
      Alert.alert('Sign Up Failed', 'All fields are required.');
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      Alert.alert('Sign Up Failed', 'Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const user = await signup!(email.trim(), password);
      if (user) {
        await updateProfile(user, { displayName: name });
      }
      toast({ title: 'Account created successfully!', variant: 'success' });
      router.replace('/tasks/page');
    } catch (error: any) {
      let description = 'An unexpected error occurred. Please try again.';
      if (error?.code === 'auth/email-already-in-use') {
        description = 'This email is already in use. Please log in instead.';
      } else if (error?.code === 'auth/weak-password') {
        description = 'The password is too weak. Please use a stronger password.';
      }
      toast({ title: 'Sign Up Failed', description, variant: 'destructive' });
      Alert.alert('Sign Up Failed', description);
    } finally {
      setIsLoading(false);
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

            <Text style={styles.title}>Sign Up</Text>
            <Text style={styles.description}>Enter your information to create an account</Text>

            <View style={styles.form}>
              <Text style={styles.label}>Name</Text>
              <TextInput style={styles.input} placeholder="Max Robinson" value={name} onChangeText={setName} editable={!isLoading} />

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

              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="••••••••"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!isLoading}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeButton}>
                  {showConfirmPassword ? <EyeOff size={20} color="#aaa" /> : <Eye size={20} color="#aaa" />}
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.primaryButton} onPress={handleSignUp} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Create an account</Text>}
              </TouchableOpacity>

              {/* Centered Forgot Password (also available on signup) */}
              <TouchableOpacity onPress={handleForgotInSignup} disabled={isLoading} style={styles.forgotCenter}>
                <Text style={styles.forgotPassword}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.footerText}>
              Already have an account?{' '}
              <Link href="/login" asChild>
                <Text style={styles.footerLink}>Log in</Text>
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
  title: { fontSize: 18, fontWeight: '700', marginTop: 10, color: '#fff' },
  description: { color: '#aaa', marginBottom: 16 },
  form: { gap: 12 },
  label: { color: '#fff', marginTop: 8 },
  input: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 10, color: '#fff' },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  eyeButton: { paddingHorizontal: 8 },
  primaryButton: { backgroundColor: '#6d28d9', padding: 14, borderRadius: 8, marginTop: 12, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '600' },
  forgotCenter: { alignItems: 'center', marginTop: 12 },
  forgotPassword: { fontSize: 13, textDecorationLine: 'underline', color: '#aaa' },
  footerText: { marginTop: 14, textAlign: 'center', color: '#ccc' },
  footerLink: { textDecorationLine: 'underline', color: '#6d28d9' },
});
