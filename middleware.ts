import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  console.log('AUTH_SECRET>>>>>>>>>>>>>>>>>>>', process.env.AUTH_SECRET);
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });
  console.log('token>>>>>>>>>>>>>>>>>>>', token);
  if (!token) {
    // Redirect to login page
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/files/:path*'],
};
